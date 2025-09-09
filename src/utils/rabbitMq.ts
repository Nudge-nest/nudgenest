export const publishToExchange = (exchange: any, channel: any, publishJson: any) => {
    const publishBuffer = Buffer.from(JSON.stringify(publishJson));
    channel.publish(exchange, '', publishBuffer);
};
