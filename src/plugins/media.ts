/*Handles all things related to AWS media*/
import Hapi from '@hapi/hapi';

import * as dotenv from 'dotenv';
import Busboy from 'busboy';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

dotenv.config();

// Types
interface UploadedFile {
    filename: string;
    headers: { [key: string]: string };
    payload: Buffer;
}

// Configuration
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_REQUEST = 5;

declare module '@hapi/hapi' {
    interface ServerApplicationState {
        reviewMediaPlugin: any;
    }
}

const reviewMediaPlugin: Hapi.Plugin<null> = {
    name: 'reviewMediaPlugin',
    dependencies: ['prisma'],
    register: async (server: Hapi.Server) => {
        server.route([
            {
                method: 'POST',
                path: '/api/v1/media',
                handler: uploadMediaToS3Handler,
                options: {
                    auth: false,
                    payload: {
                        output: 'stream', // Important: This gives us parsed file objects
                        parse: false,
                        multipart: true,
                        allow: 'multipart/form-data',
                        maxBytes: MAX_FILE_SIZE * MAX_FILES_PER_REQUEST,
                        timeout: 60000, // 60 seconds for large files
                        uploads: '/tmp', // Temporary directory for large files
                    },
                },
            },
            {
                method: 'DELETE',
                path: '/api/v1/media/{mediaUrl}',
                handler: deleteMediaFromS3Handler,
                options: {
                    auth: false,
                },
            },
        ]);
    },
};

const uploadMediaToS3Handler = async (request: Hapi.Request, h: Hapi.ResponseToolkit): Promise<Hapi.ResponseObject> => {
    return new Promise((resolve) => {
        const files: Array<{ buffer: Buffer; filename: string; contentType: string }> = [];
        let reviewId = '';
        let merchantId = '';

        const busboy = Busboy({ headers: request.headers });

        // Handle form fields
        busboy.on('field', (fieldname: string, value: string) => {
            if (fieldname === 'reviewId') reviewId = value;
            if (fieldname === 'merchantId') merchantId = value;
        });

        // Handle files
        busboy.on('file', (fieldname: string, file: NodeJS.ReadableStream, info: any) => {
            const chunks: Buffer[] = [];

            file.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });

            file.on('end', () => {
                const buffer = Buffer.concat(chunks);
                files.push({
                    buffer,
                    filename: info.filename || `file_${files.length}.jpg`,
                    contentType: info.mimeType || 'image/jpeg',
                });
                console.log(`File received: ${info.filename}, ${buffer.length} bytes`);
            });
        });

        // Upload when done
        busboy.on('finish', async () => {
            try {
                const s3Client = new S3Client({
                    region: process.env.APP_AWS_REGION,
                    credentials: {
                        accessKeyId: process.env.APP_AWS_ACCESS_KEY!,
                        secretAccessKey: process.env.APP_AWS_SECRET_KEY!,
                    },
                });

                const uploadedFiles = [];

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const timestamp = Date.now();
                    const randomId = crypto.randomBytes(4).toString('hex');
                    const fileName = `${merchantId}/${timestamp}_${randomId}_${i}.jpg`;

                    await s3Client.send(
                        new PutObjectCommand({
                            Bucket: process.env.APP_AWS_BUCKET_NAME!,
                            Key: fileName,
                            Body: file.buffer,
                            ContentType: file.contentType,
                        })
                    );

                    uploadedFiles.push({
                        id: crypto.randomUUID(),
                        url: `https://${process.env.APP_AWS_BUCKET_NAME}.s3.${process.env.APP_AWS_REGION}.amazonaws.com/${fileName}`,
                        filename: file.filename,
                        size: file.buffer.length,
                        type: file.contentType,
                    });
                }

                resolve(
                    h
                        .response({
                            version: '1.0.0',
                            data: uploadedFiles,
                        })
                        .code(200)
                );
            } catch (error: any) {
                resolve(
                    h
                        .response({
                            version: '1.0.0',
                            error: 'Upload failed',
                        })
                        .code(500)
                );
            }
        });

        request.raw.req.pipe(busboy);
    });
};

const deleteMediaFromS3Handler = async (request: Hapi.Request, h: Hapi.ResponseToolkit) => {
    const { mediaUrl } = request.payload as { mediaUrl: string };
    try {
        // Extract S3 key from URL
        // URL format: https://nudge-nest-media.s3.eu-north-1.amazonaws.com/2/1753094603049_33cf89fe_0.jpg
        // Key should be: 2/1753094603049_33cf89fe_0.jpg

        const bucketName = process.env.APP_AWS_BUCKET_NAME!;
        const region = process.env.APP_AWS_REGION!;
        const expectedPrefix = `https://${bucketName}.s3.${region}.amazonaws.com/`;

        if (!mediaUrl.startsWith(expectedPrefix)) {
            return h
                .response({
                    version: '1.0.0',
                    error: 'Invalid media URL format',
                })
                .code(400);
        }

        // Extract the S3 key (everything after the bucket URL)
        const s3Key = mediaUrl.replace(expectedPrefix, '');

        // Validate the key format (should start with merchantId/)
        if (!s3Key.includes('/')) {
            return h
                .response({
                    version: '1.0.0',
                    error: 'Invalid S3 key format',
                })
                .code(400);
        }

        // Create S3 client
        const s3Client = new S3Client({
            region: process.env.APP_AWS_REGION,
            credentials: {
                accessKeyId: process.env.APP_AWS_ACCESS_KEY!,
                secretAccessKey: process.env.APP_AWS_SECRET_KEY!,
            },
        });

        // Delete from S3
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: bucketName,
                Key: s3Key,
            })
        );

        console.log('Successfully deleted:', s3Key);
        return h.response({ version: '1.0.0', data: s3Key }).code(200);
    } catch (error: any) {
        return h
            .response({
                version: '1.0.0',
                error: error.message,
            })
            .code(500);
    }
};

export default reviewMediaPlugin;
