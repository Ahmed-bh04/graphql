const DOMAIN = 'learn.reboot01.com';
const SIGNIN_URL = `https://${DOMAIN}/api/auth/signin`;
const GRAPHQL_URL = `https://${DOMAIN}/api/graphql-engine/v1/graphql`;
const TOKEN_KEY = 'jwt';

function encodeBasic(identifier, password) {
  const bytes = new TextEncoder().encode(`${identifier}:${password}`);
  return btoa(String.fromCharCode(...bytes));
}

export async function signIn(identifier, password) {
  const res = await fetch(SIGNIN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${encodeBasic(identifier, password)}` },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error((body && body.error) || 'Invalid username or password');
  }

  localStorage.setItem(TOKEN_KEY, typeof body === 'string' ? body : body.token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function logOut() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function graphql(query, variables) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok && !body) throw new Error(`The server replied ${res.status}.`);
  if (body.errors) throw new Error(body.errors[0].message);

  return body.data;
}

export const USER_QUERY = `
  query User {
    user {
      id
      login
      firstName
      lastName
      email
      auditRatio
      totalUp
      totalDown
    }
  }
`;

export const XP_QUERY = `
  query Xp {
    transaction(where: { type: { _eq: "xp" } }, order_by: { createdAt: asc }) {
      amount
      createdAt
      path
      object {
        name
      }
    }
  }
`;

export const PROGRESS_QUERY = `
  query Progress($type: String!) {
    progress(where: { object: { type: { _eq: $type } } }) {
      grade
      path
      object {
        name
      }
    }
  }
`;
