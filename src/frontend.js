const Koa = require('koa')
const route = require('koa-route')
// const views = require('koa-views')
// const parse = require('co-body')

const fetch = require('node-fetch')
const HttpsProxyAgent = require('http-proxy-agent')

const app = new Koa()

// const viewDir = __dirname
// console.log('viewDir', viewDir)

// app.use(
//   views(viewDir, {
//     map: {
//       html: 'nunjucks',
//     },
//   })
// )

app.use(route.get('/api/*', api))
app.use(route.get('/*', all))

console.log('env', JSON.stringify(process.env, null, 2))

function apiCall(headers = {}) {
  let default_url = process.env.BACKEND_PORT_3001_TCP_ADDR
    ? `http://${process.env.BACKEND_PORT_3001_TCP_ADDR}:3001`
    : null
  let backend_url = process.env.BACKEND_URL || default_url || 'http://localhost:3001'

  // forward needed headers
  let keys = Object.keys(headers)
  let passHeaders = {}
  keys.forEach(key => {
    if (
      key.startsWith('l5d-ctx') ||
      key.startsWith('x-b3') ||
      key.startsWith('x-ot') ||
      key === 'x-request-id'
    ) {
      passHeaders[key] = headers[key]
    }
  })

  console.log('forwarding headers:', passHeaders)

  // use proxy if needed
  let agent = null
  if (process.env.HTTP_PROXY) {
    agent = new HttpsProxyAgent(process.env.HTTP_PROXY)
  }

  return fetch(backend_url, {
    headers: passHeaders,
    agent,
  })
    .then(response => {
      if (response.ok) {
        return response.json()
      }
      throw new Error(`Network response was not ok. ${response.status}`)
    })
    .then(json => {
      return json
    })
    .catch(e => {
      return { message: e, env: { HOSTNAME: 'n/a' } }
    })
}

async function api(ctx) {
  console.log('receving api request...')

  let apiResponse = await apiCall(this.request.headers)

  ctx.body = apiResponse
}

async function all(ctx) {
  console.log('receving request...')

  let env = process.env

  let call1, call2, apiResponse
  call1 = apiCall(this.request.headers)
  call2 = apiCall(this.request.headers)
  await call1
  apiResponse = await call2

  let message = apiResponse.message || 'n/a'

  ctx.body = `frontend: ${env.HOSTNAME}. backend: ${apiResponse.env.HOSTNAME}, message: ${message}`
}

module.exports = app
