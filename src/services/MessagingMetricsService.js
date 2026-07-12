const normalizeError = error => ({
  errorCode: error && error.code,
  errorMessage: error && error.message ? error.message : String(error),
});

const write = (level, event, fields = {}) => {
  const payload = JSON.stringify({
    component: 'parse-messaging',
    event,
    ...fields,
  });

  // eslint-disable-next-line no-console
  console[level](payload);
};

const info = (event, fields) => write('info', event, fields);

const warn = (event, fields) => write('warn', event, fields);

const error = (event, caughtError, fields = {}) =>
  write('error', event, {
    ...fields,
    ...normalizeError(caughtError),
  });

const measure = async (event, fields, operation) => {
  const startedAt = Date.now();

  try {
    const result = await operation();
    info(event, {
      ...fields,
      durationMs: Date.now() - startedAt,
      status: 'success',
    });
    return result;
  } catch (caughtError) {
    error(event, caughtError, {
      ...fields,
      durationMs: Date.now() - startedAt,
      status: 'failure',
    });
    throw caughtError;
  }
};

export default {
  error,
  info,
  measure,
  warn,
};

