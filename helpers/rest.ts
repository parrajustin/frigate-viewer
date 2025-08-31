import {Buffer} from 'buffer';
import {LogBox, ToastAndroid} from 'react-native';
import crashlytics from '@react-native-firebase/crashlytics';
import {Server} from '../store/settings';
import {useIntl} from 'react-intl';
import {messages} from './rest.messages';
import { Header } from 'react-native/Libraries/NewAppScreen';

export const buildServerUrl = (server: Server) => {
  const {protocol, host, port, path} = server;
  const pathPart = path
    ? `${path
        .split('/')
        .filter(p => p !== '')
        .join('/')}/`
    : '';
  return protocol && host
    ? `${protocol}://${host}${port ? `:${port}` : ''}/${pathPart}`
    : undefined;
};

export const buildServerApiUrl = (server: Server) => {
  const serverUrl = buildServerUrl(server);
  return serverUrl ? `${serverUrl}api` : undefined;
};

export const buildHeaders = (server: Server) => {
  const headers: Record<string, string> = {};
  if (server.auth === 'basic') {
    headers.Authorization = `Basic ${Buffer.from(
      `${server.credentials.username}:${server.credentials.password}`,
    ).toString('base64')}`;
  }
  server.headers?.forEach(header => {
    headers[header.name] = header.value;
  });
  return headers;
};

export const authorizationHeader = buildHeaders;

export const useRest = () => {
  const intl = useIntl();

  const login = async (server: Server) => {
    try {
      const url = `${buildServerApiUrl(server)}/login`;
      crashlytics().log(`POST ${url}`);

      const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...buildHeaders(server)
      };
      const response = await fetch(url, {
        method: 'POST',
        headers: new Header(headers),
        body: JSON.stringify({
          user: server.credentials.username,
          password: server.credentials.password,
        }),
      });
      if (response.status === 400) {
        throw new Error(
          intl.formatMessage(messages['frigateAuth.wrongCredentials']),
        );
      }
      return response.json();
    } catch (error) {
      crashlytics().recordError(error as Error);
      const e = error as {message: string};
      ToastAndroid.show(e.message, ToastAndroid.LONG);
      return Promise.reject();
    }
  };

  interface QueryOptions {
    queryParams?: Record<string, string>;
    json?: boolean;
  }

  const query = async <T>(
    server: Server,
    method: 'GET' | 'POST' | 'DELETE',
    endpoint: string,
    options: QueryOptions = {},
  ): Promise<T> => {
    try {
      const {queryParams, json} = options;
      const url = `${buildServerApiUrl(server)}/${endpoint}`;
      const headers = buildHeaders(server);
      const executeFetch = () =>
        fetch(
          `${url}${queryParams ? `?${new URLSearchParams(queryParams)}` : ''}`,
          {
            method,
            headers: new Headers(headers),
          },
        );
      crashlytics().log(`${method} ${url}`);
      const response = await executeFetch();
      if (!response.ok) {
        crashlytics().log(`HTTP/${response.status}: ${method} ${url}`);
      }
      if (response.status === 401) {
        if (server.auth === 'frigate') {
          await login(server);
          const retriedResponse = await executeFetch();
          return retriedResponse[json === false ? 'text' : 'json']();
        } else {
          crashlytics().log(`Unauthorized`);
          throw new Error(
            intl.formatMessage(messages['error.unauthorized'], {url}),
          );
        }
      }
      return response[json === false ? 'text' : 'json']();
    } catch (error) {
      crashlytics().recordError(error as Error);
      const e = error as {message: string};
      ToastAndroid.show(e.message, ToastAndroid.LONG);
      return Promise.reject();
    }
  };

  const get = async <T>(
    server: Server,
    endpoint: string,
    options?: QueryOptions,
  ): Promise<T> => {
    return query(server, 'GET', endpoint, options);
  };

  const post = async <T>(
    server: Server,
    endpoint: string,
    options?: QueryOptions,
  ): Promise<T> => {
    return query(server, 'POST', endpoint, options);
  };

  const del = async <T>(
    server: Server,
    endpoint: string,
    options?: QueryOptions,
  ): Promise<T> => {
    return query(server, 'DELETE', endpoint, options);
  };

  return {
    get,
    post,
    del,
  };
};
