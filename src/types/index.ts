export interface IPayload<T> {
    userId: string;
    context: {
        action: string;
        details: string;
    };
    content: T;
}

export enum EventPriority {
    NORMAL,
    MEDIUM,
    HIGH,
}

export interface IRabbitDataObject<T> {
    messageId: string;
    timestamp: string;
    eventType: string;
    priority: 'NORMAL' | 'MEDIUM' | 'HIGH';
    payload: IPayload<T>;
    metadata: {
        retries: number;
    };
}

export interface IShopifyCustomer {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    state: string;
    verified_email: boolean;
    phone?: string | null;
}

export interface IReviewMessagePayloadContent {
    userName: string;
    type: string;
    email: string;
    line_items: [];
    order_number: number;
    reviewId: string;
}

export interface IShopifyWebhookMessagePayloadContent {
    customer: IShopifyCustomer;
    merchant_business_entity_id: string;
    id: string;
    order_status_url: string;
    customer_locale: string;
    order_number: number;
    line_items: [];
}

export interface IMerchant {
    id: string;
    shopId: string;
    domains?: object;
    currencyCode: string;
    email: string;
    name: string;
    businessInfo: string;
    address: any;
    createdAt?: string;
    updatedAt?: string;
}

export interface IReview {
    id?: string;
    merchantBusinessId: string;
    merchantId: string;
    items: IReviewItem[];
    result: IReviewResult[];
    status: 'Pending' | 'Completed' | 'Failed';
    createdAt: string;
    updatedAt: string;
}

export interface IReviewItem {
    [key: string]: any; // Or make a stricter type if known
}

export interface IReviewResult {
    [key: string]: number | string | IUploadedMediaObject;
}

export interface IUploadedMediaObject {
    id: string;
    mediaURL: string;
}
