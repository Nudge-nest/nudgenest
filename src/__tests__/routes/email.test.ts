// src/__tests__/services/email.service.test.ts

// Mock fs/promises
const mockReadFile = jest.fn();
jest.mock('fs/promises', () => ({
    readFile: mockReadFile,
}));

// Mock ejs
const mockRender = jest.fn();
jest.mock('ejs', () => ({
    render: mockRender,
}));

// Mock nodemailer
const mockSendMail = jest.fn();
const mockClose = jest.fn();
jest.mock('nodemailer', () => ({
    __esModule: true,
    default: {
        createTransport: jest.fn(() => ({
            sendMail: mockSendMail,
            close: mockClose,
        })),
    },
}));

import EmailService, { EmailData } from '../../email-service';

describe('EmailService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Clear the template cache between tests since EmailService is a singleton
        (EmailService as any).templateCache.clear();

        // Set up default mock implementations
        mockReadFile.mockResolvedValue('<html>Test Template {{userName}}</html>');
        mockRender.mockReturnValue('<html>Rendered Email for John Doe</html>');
        mockSendMail.mockResolvedValue({ messageId: 'test-123' });
        mockClose.mockResolvedValue(undefined);
    });

    describe('sendEmail', () => {
        test('sends email successfully', async () => {
            const emailData: EmailData = {
                userName: 'John Doe',
                email: 'john@example.com',
                type: 'new-review',
                reviewId: 'review-123',
                order_number: '12345',
            };

            const result = await EmailService.sendEmail(emailData);

            expect(result).toBe(true);
            expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('templates/master.ejs'), 'utf-8');
            expect(mockRender).toHaveBeenCalledWith(
                '<html>Test Template {{userName}}</html>',
                expect.objectContaining({
                    userName: 'John Doe',
                    email: 'john@example.com',
                    subject: 'John Doe, how was your recent purchase?',
                })
            );
            expect(mockSendMail).toHaveBeenCalledWith({
                from: '"Nudge Nest" <no-reply@nudge-nest.app>',
                to: 'john@example.com',
                subject: 'John Doe, how was your recent purchase?',
                html: '<html>Rendered Email for John Doe</html>',
                headers: {
                    'List-Unsubscribe': '<undefined>',
                },
            });
        });

        test('returns false when email fails', async () => {
            mockSendMail.mockRejectedValueOnce(new Error('SMTP Error'));

            const emailData: EmailData = {
                userName: 'John Doe',
                email: 'john@example.com',
                type: 'new-review',
            };

            const result = await EmailService.sendEmail(emailData);

            expect(result).toBe(false);
        });
    });

    describe('convenience methods', () => {
        test('sendReviewRequest calls sendEmail with correct type', async () => {
            const spy = jest.spyOn(EmailService, 'sendEmail');
            spy.mockResolvedValueOnce(true);

            const emailData: EmailData = {
                userName: 'Jane Doe',
                email: 'jane@example.com',
                reviewId: 'review-456',
            };

            await EmailService.sendReviewRequest(emailData);

            expect(spy).toHaveBeenCalledWith({
                ...emailData,
                type: 'new-review',
            });

            spy.mockRestore();
        });

        test('sendReviewReminder calls sendEmail with correct type', async () => {
            const spy = jest.spyOn(EmailService, 'sendEmail');
            spy.mockResolvedValueOnce(true);

            const emailData: EmailData = {
                userName: 'Jane Doe',
                email: 'jane@example.com',
                order_number: '67890',
            };

            await EmailService.sendReviewReminder(emailData);

            expect(spy).toHaveBeenCalledWith({
                ...emailData,
                type: 'reminder',
            });

            spy.mockRestore();
        });

        test('sendMerchantWelcome calls sendEmail with correct type', async () => {
            const spy = jest.spyOn(EmailService, 'sendEmail');
            spy.mockResolvedValueOnce(true);

            const emailData: EmailData = {
                userName: 'Merchant Name',
                email: 'merchant@example.com',
            };

            await EmailService.sendMerchantWelcome(emailData);

            expect(spy).toHaveBeenCalledWith({
                ...emailData,
                type: 'merchant-welcome',
            });

            spy.mockRestore();
        });

        test('sendCompletedReview calls sendEmail with correct type', async () => {
            const spy = jest.spyOn(EmailService, 'sendEmail');
            spy.mockResolvedValueOnce(true);

            const emailData: EmailData = {
                userName: 'Customer Name',
                email: 'customer@example.com',
                hasIncentive: true,
            };

            await EmailService.sendCompletedReview(emailData);

            expect(spy).toHaveBeenCalledWith({
                ...emailData,
                type: 'completed-review',
            });

            spy.mockRestore();
        });
    });

    describe('sendBatch', () => {
        test('sends multiple emails and returns success count', async () => {
            const emails: EmailData[] = [
                { userName: 'User 1', email: 'user1@example.com', type: 'new-review' },
                { userName: 'User 2', email: 'user2@example.com', type: 'new-review' },
                { userName: 'User 3', email: 'user3@example.com', type: 'reminder' },
            ];

            const successCount = await EmailService.sendBatch(emails);

            expect(successCount).toBe(3);
            expect(mockSendMail).toHaveBeenCalledTimes(3);
        });

        test('counts only successful emails', async () => {
            mockSendMail
                .mockResolvedValueOnce({ messageId: 'success-1' })
                .mockRejectedValueOnce(new Error('Failed'))
                .mockResolvedValueOnce({ messageId: 'success-2' });

            const emails: EmailData[] = [
                { userName: 'User 1', email: 'user1@example.com', type: 'new-review' },
                { userName: 'User 2', email: 'user2@example.com', type: 'new-review' },
                { userName: 'User 3', email: 'user3@example.com', type: 'reminder' },
            ];

            const successCount = await EmailService.sendBatch(emails);

            expect(successCount).toBe(2);
        });
    });

    describe('close', () => {
        test('closes the transporter', async () => {
            await EmailService.close();

            expect(mockClose).toHaveBeenCalled();
        });
    });

    describe('email templates', () => {
        test('caches templates after first load', async () => {
            const emailData: EmailData = {
                userName: 'Test User',
                email: 'test@example.com',
                type: 'new-review',
            };

            // Send two emails
            await EmailService.sendEmail(emailData);
            await EmailService.sendEmail(emailData);

            // Template should only be loaded once due to caching
            expect(mockReadFile).toHaveBeenCalledTimes(1);
            expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('templates/master.ejs'), 'utf-8');
        });
    });

    describe('email configuration', () => {
        test('generates correct config for review request', async () => {
            const emailData: EmailData = {
                userName: 'Test User',
                email: 'test@example.com',
                type: 'new-review',
                reviewId: 'review-123',
            };

            await EmailService.sendEmail(emailData);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'Test User, how was your recent purchase?',
                })
            );
        });

        test('generates correct config for review reminder', async () => {
            const emailData: EmailData = {
                userName: 'Test User',
                email: 'test@example.com',
                type: 'reminder',
                order_number: '12345',
            };

            await EmailService.sendEmail(emailData);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'Quick reminder: Share your thoughts on order #12345',
                })
            );
        });

        test('generates correct config for merchant welcome', async () => {
            const emailData: EmailData = {
                userName: 'Merchant Name',
                email: 'merchant@example.com',
                type: 'merchant-welcome',
            };

            await EmailService.sendEmail(emailData);

            expect(mockSendMail).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'Welcome to Nudge Nest, Merchant Name!',
                })
            );
        });
    });

    describe('error handling', () => {
        test('handles template loading errors', async () => {
            // Clear the cache first to ensure fs.readFile gets called
            (EmailService as any).templateCache.clear();

            mockReadFile.mockRejectedValueOnce(new Error('Template not found'));

            const emailData: EmailData = {
                userName: 'Test User',
                email: 'test@example.com',
                type: 'new-review',
            };

            const result = await EmailService.sendEmail(emailData);

            expect(result).toBe(false);
            expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('templates/master.ejs'), 'utf-8');
        });

        test('handles template rendering errors', async () => {
            mockRender.mockImplementationOnce(() => {
                throw new Error('Template render error');
            });

            const emailData: EmailData = {
                userName: 'Test User',
                email: 'test@example.com',
                type: 'new-review',
            };

            const result = await EmailService.sendEmail(emailData);

            expect(result).toBe(false);
        });

        test('handles sendMail errors', async () => {
            mockSendMail.mockRejectedValueOnce(new Error('SMTP connection failed'));

            const emailData: EmailData = {
                userName: 'Test User',
                email: 'test@example.com',
                type: 'new-review',
            };

            const result = await EmailService.sendEmail(emailData);

            expect(result).toBe(false);
        });
    });
});
