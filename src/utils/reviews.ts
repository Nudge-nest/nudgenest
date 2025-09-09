import { IDataFromShopifyPayload, IReviewMessagePayloadContent } from '../types';

export const extractShopifyDataForRabbitMessaging = (payload: any): IDataFromShopifyPayload => {
    const {
        customer,
        merchant_business_entity_id,
        order_status_url,
        id,
        customer_locale,
        order_number,
        line_items,
        currency,
    } = payload;
    const { id: customerId, first_name, last_name, state, email, phone, verified_email } = customer || {};
    return {
        customer: { id: customerId, first_name, last_name, state, email, phone, verified_email },
        merchant_business_entity_id,
        order_status_url,
        id,
        customer_locale,
        order_number,
        line_items,
        currency,
    };
};

export const buildPublishJson = (content: any, sampleMessage: any) => ({
    ...sampleMessage,
    eventType: 'new-review',
    payload: {
        ...sampleMessage.payload,
        content: content,
        context: {
            ...sampleMessage.payload.context,
            receiver: ['reviewer', 'reviewee'],
        },
    },
});

export const extractMessagingContentFromShopifyData = (
    shopifyOrderData: IDataFromShopifyPayload,
    reviewId: string
): IReviewMessagePayloadContent => {
    const { customer, line_items, order_number, currency } = shopifyOrderData;
    return {
        userName: customer.first_name,
        type: 'auto',
        email: customer.email,
        line_items: line_items,
        order_number: order_number,
        reviewId: reviewId,
        currency: currency,
    };
};

const extractShopIdFromOrderStatusUrl = (url: string): unknown => {
    const match = url.match(/\/(\d+)\/orders\//);

    if (match && match[1]) {
        return match[1];
    }

    // Return null if pattern doesn't match
    return null;
};

export const getMerchantWithBusinessInfo = async (prisma: any, businessInfoString: string) => {
    return prisma.merchants.findFirstOrThrow({
        where: {
            businessInfo: {
                contains: businessInfoString,
            },
        },
    });
};

export const createNewReview = async (prisma: any, reviewData: IDataFromShopifyPayload, merchantId: string) => {
    const { merchant_business_entity_id, customer, line_items, order_status_url } = reviewData;
    if (!customer?.email) {
        throw new Error('Missing customer email');
    }
    const shopId = extractShopIdFromOrderStatusUrl(order_status_url);
    try {
        const newReview = await prisma.reviews.create({
            data: {
                merchantId: merchantId,
                merchantBusinessId: merchant_business_entity_id,
                shopId: shopId,
                customerPhone: customer.phone || '',
                customerEmail: customer.email,
                customerName: `${customer.first_name} ${customer.last_name}`,
                items: line_items,
                //merchantsId:
            },
        });
        console.log("['info'] New review created", newReview.id);
        return newReview;
    } catch (error: any) {
        throw new Error(error.message);
    }
};
