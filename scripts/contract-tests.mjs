const source = process.env['CONTRACT_OPENAPI_URL'];
if (!source) throw new Error('CONTRACT_OPENAPI_URL is required; contract truth must come from the real API.');

const response = await fetch(source);
if (!response.ok) throw new Error(`OpenAPI request failed: ${response.status}`);
const document = await response.json();

function operation(path, method) {
  const value = document.paths?.[path]?.[method];
  if (!value) throw new Error(`Missing ${method.toUpperCase()} ${path}`);
  return value;
}

function resolve(schema) {
  if (!schema?.$ref) return schema;
  return schema.$ref.split('/').slice(1).reduce((value, key) => value?.[key], document);
}

function responseSchema(operationValue, status) {
  const schema = operationValue.responses?.[status]?.content?.['application/json']?.schema;
  if (!schema) throw new Error(`Missing JSON schema for response ${status}`);
  return resolve(schema);
}

function expectProperties(schema, expected) {
  for (const [name, type] of Object.entries(expected)) {
    const property = resolve(schema.properties?.[name]);
    if (!property) throw new Error(`Missing property ${name}`);
    if (type && property.type !== type) throw new Error(`${name}: expected ${type}, received ${property.type}`);
  }
}

const invite = operation('/convites/public/{token}/aceitar-prestador', 'post');
expectProperties(responseSchema(invite, '200'), { status: null, prestadorIdentidadeID: 'integer' });

const profile = operation('/v2/public/esus/{esusId}', 'get');
expectProperties(responseSchema(profile, '200'), {
  esusId: 'integer', tipo: 'string', publicBookingEnabled: 'boolean', timeZoneId: 'string',
});

const offers = operation('/v2/public/esus/{esusId}/service-offers', 'get');
expectProperties(responseSchema(offers, '200'), { serviceOffers: 'array' });

const availability = operation('/v2/public/esus/{esusId}/availability/search', 'get');
for (const parameterName of ['esusId', 'ServiceOfferId', 'StartDate', 'EndDate']) {
  const parameter = availability.parameters?.find((item) => item.name === parameterName);
  if (!parameter) throw new Error(`Availability is missing parameter ${parameterName}`);
  if (parameterName === 'esusId' && !parameter.required) throw new Error('Availability esusId path parameter must be required');
  if (!parameter.required) throw new Error(`Availability parameter ${parameterName} must be required`);
}
expectProperties(responseSchema(availability, '200'), {
  executionEsusId: 'integer', serviceOfferId: 'integer', startDate: 'string', endDate: 'string', items: 'array',
});

const submit = operation('/v2/public/esus/{esusId}/bookings', 'post');
if (!submit.requestBody) throw new Error('Public booking must document its request body');
if (!submit.requestBody.required) throw new Error('Public booking request body must be required');
expectProperties(resolve(submit.requestBody.content?.['application/json']?.schema), {
  serviceOfferId: 'integer', executionLocationId: 'integer', prestadorId: 'integer', requestedStartUtc: 'string', visitorName: 'string', visitorPhone: 'string',
});
expectProperties(responseSchema(submit, '201'), {
  status: 'string', bookingId: 'integer', bookingRequestId: 'integer', serviceLabel: 'string', startUtc: 'string', endUtc: 'string', price: 'number', currency: 'string', publicStatusToken: 'string',
});

const status = operation('/v2/public/esus/{esusId}/booking-status/{token}', 'get');
for (const parameterName of ['esusId', 'token']) {
  if (!status.parameters?.some((parameter) => parameter.name === parameterName && parameter.required)) {
    throw new Error(`Booking status is missing required path parameter ${parameterName}`);
  }
}
expectProperties(responseSchema(status, '200'), { status: 'string', startUtc: 'string', endUtc: 'string', serviceLabel: 'string' });

console.log('Booking L5 contract tests passed: invite identity and Public Booking V2 surface.');
