/**
 * The goal of this test is to measure how quickly a client reconnects
 * after manually switching networks / e.g. from wifi to mobile data.
 *
 * It requires some extra modules to get the relays:
 * npm install --no-save spacetrace spacecore-id-encoding @samooth/keet-default-config
 */

function customLogger (data) {
  console.log(`   ... ${data.id} ${Object.keys(data.caller.props || []).join(',')} ${data.caller.filename}:${data.caller.line}:${data.caller.column}`)
}
require('spacetrace').setTraceFunction(customLogger)

const { DEV_BLIND_RELAY_KEYS } = require('@samooth/keet-default-config')
const SpacecoreId = require('spacecore-id-encoding')
const DEV_RELAY_KEYS = DEV_BLIND_RELAY_KEYS.map(SpacecoreId.decode)
const relayThrough = (force) => force ? DEV_RELAY_KEYS : null

const Spaceswarm = require('../..')

const topic = Buffer.alloc(32).fill('measure-reconnect')
const seed = Buffer.alloc(32).fill('measure-reconnect' + require('os').hostname())

const swarm = new Spaceswarm({ seed, relayThrough })

swarm.dht.on('network-change', () => {
  console.log('NETWORK CHANGE')
  console.time('RECONNECTION TIME')
})

let connected = false

swarm.on('connection', async (conn) => {
  console.log(conn.rawStream.remoteHost)
  conn.on('error', console.log.bind(console))
  conn.on('close', console.log.bind(console))
  conn.on('data', (data) => console.log(data.toString('utf8')))
  conn.setKeepAlive(5000)
  conn.write('hello')
  if (!connected) {
    connected = true
    console.timeEnd('INITIAL CONNECTION TIME')
    return
  }
  console.timeEnd('RECONNECTION TIME')
})

console.time('INITIAL CONNECTION TIME')
swarm.join(topic)

// process.on('SIGINT', () => {
//   swarm.leave(topic).then(() => process.exit())
// })
