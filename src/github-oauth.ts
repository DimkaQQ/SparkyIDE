/**
 * GitHub device flow (RFC 8628) for a browser-only app.
 *
 * github.com sends no CORS headers, so every request goes through the
 * `/github-oauth` proxy configured in vite.config.js. No client secret is
 * involved, which is exactly why the device flow is used instead of the
 * authorization-code flow.
 */

/** OAuth App client id. Override with VITE_GITHUB_CLIENT_ID for your own app. */
export const GITHUB_CLIENT_ID: string =
  (import.meta.env.VITE_GITHUB_CLIENT_ID as string | undefined)?.trim() ||
  'Ov23liy4dwCYtgmaJxEl';

/** Scopes requested at sign-in: push to repositories and workflow files. */
export const GITHUB_SCOPES = 'repo workflow';

const PROXY = '/github-oauth';
const DEVICE_POLL_GRANT = 'urn:ietf:params:oauth:grant-type:device_code';

export interface DeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}

export class DeviceFlowError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DeviceFlowError';
    this.code = code;
  }
}

async function postForm(path: string, form: Record<string, string>): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`${PROXY}${path}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
        // GitHub requires this for JSON responses on the older endpoints.
        'x-github-api-version': '2022-11-28',
      },
      body: new URLSearchParams(form).toString(),
    });
  } catch {
    throw new DeviceFlowError(
      'network',
      'Could not reach GitHub. GitHub sign-in needs the Vite dev server proxy: run the app with `npm run dev` or `npm run preview`.',
    );
  }

  if (response.status === 404) {
    throw new DeviceFlowError(
      'proxy',
      'The GitHub sign-in proxy is not available on this origin. Run the app through `npm run dev` (or `npm run preview`), or paste a personal access token instead.',
    );
  }

  const text = await response.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new DeviceFlowError(
      'proxy',
      `GitHub returned an unexpected response (${response.status}). GitHub sign-in needs the Vite dev server proxy.`,
    );
  }
}

/** Asks GitHub for a user code the developer types at github.com/login/device. */
export async function startDeviceFlow(clientId = GITHUB_CLIENT_ID): Promise<DeviceAuthorization> {
  const data = await postForm('/login/device/code', {
    client_id: clientId,
    scope: GITHUB_SCOPES,
  });

  if (typeof data.device_code !== 'string' || typeof data.user_code !== 'string') {
    if (data.error === 'device_flow_disabled') {
      throw new DeviceFlowError(
        'device_flow_disabled',
        'Device flow is disabled for this OAuth App. Open its settings and tick "Enable Device Flow".',
      );
    }
    const description =
      typeof data.error_description === 'string' ? data.error_description : String(data.error ?? '');
    throw new DeviceFlowError(
      typeof data.error === 'string' ? data.error : 'unknown',
      description || 'GitHub did not return a device code.',
    );
  }

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri:
      typeof data.verification_uri === 'string' ? data.verification_uri : 'https://github.com/login/device',
    expiresIn: Number(data.expires_in ?? 900),
    interval: Number(data.interval ?? 5),
  };
}

/**
 * Polls GitHub until the developer approves the code. Resolves with the token;
 * throws when the user denies it, the code expires, or the flow is cancelled.
 */
export async function waitForAccessToken(
  authorization: DeviceAuthorization,
  options: { signal?: AbortSignal; clientId?: string; onTick?: () => void } = {},
): Promise<string> {
  const clientId = options.clientId ?? GITHUB_CLIENT_ID;
  const deadline = Date.now() + authorization.expiresIn * 1000;
  let interval = Math.max(2, authorization.interval) * 1000;

  while (Date.now() < deadline) {
    if (options.signal?.aborted) throw new DeviceFlowError('cancelled', 'Sign-in cancelled.');
    options.onTick?.();

    const data = await postForm('/login/oauth/access_token', {
      client_id: clientId,
      device_code: authorization.deviceCode,
      grant_type: DEVICE_POLL_GRANT,
    });

    if (typeof data.access_token === 'string' && data.access_token !== '') {
      return data.access_token;
    }

    const error = typeof data.error === 'string' ? data.error : '';
    if (error === 'authorization_pending') {
      // Keep waiting for the developer to approve the code.
    } else if (error === 'slow_down') {
      interval += 5000;
    } else if (error === 'access_denied') {
      throw new DeviceFlowError('access_denied', 'The request was denied on GitHub.');
    } else if (error === 'expired_token') {
      throw new DeviceFlowError('expired_token', 'The code expired. Start sign-in again.');
    } else if (error !== '') {
      const description =
        typeof data.error_description === 'string' ? data.error_description : error;
      throw new DeviceFlowError(error, description);
    }

    await new Promise((resolve) => window.setTimeout(resolve, interval));
  }

  throw new DeviceFlowError('expired_token', 'The code expired. Start sign-in again.');
}
