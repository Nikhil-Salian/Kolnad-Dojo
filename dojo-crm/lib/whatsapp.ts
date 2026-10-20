type WhatsAppReminderOptions = {
  phone: string;
  studentName: string;
  pendingMonths: string[];
  amount: number;
};

function getWhatsAppConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;

  if (!accessToken || !phoneNumberId || !templateName || !graphApiVersion) {
    throw new Error(
      'WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME, and WHATSAPP_GRAPH_API_VERSION.'
    );
  }

  return {
    accessToken,
    phoneNumberId,
    templateName,
    graphApiVersion,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en',
  };
}

export function isWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN
      && process.env.WHATSAPP_PHONE_NUMBER_ID
      && process.env.WHATSAPP_TEMPLATE_NAME
      && process.env.WHATSAPP_GRAPH_API_VERSION
  );
}

export async function sendWhatsAppFeeReminder({
  phone,
  studentName,
  pendingMonths,
  amount,
}: WhatsAppReminderOptions) {
  const config = getWhatsAppConfig();
  const normalizedPhone = phone.replace(/\D/g, '');
  if (normalizedPhone.length < 8 || normalizedPhone.length > 15) {
    throw new Error('Phone number must include a valid country code.');
  }

  const response = await fetch(
    `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedPhone,
        type: 'template',
        template: {
          name: config.templateName,
          language: { code: config.templateLanguage },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: studentName },
                { type: 'text', text: pendingMonths.join(', ') },
                { type: 'text', text: `₹${amount.toLocaleString('en-IN')}` },
              ],
            },
          ],
        },
      }),
    }
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Meta WhatsApp API returned ${response.status}: ${responseBody}`);
  }
}
