const test = require('brittle')
const crypto = require('spacecore-crypto')
const { timeout } = require('./helpers')

const RetryTimer = require('../lib/retry-timer')
const PeerInfo = require('../lib/peer-info')

const BACKOFFS = [
  50,
  150,
  250,
  350
]
const MAX_JITTER = 20

const isLinux = process.platform === 'linux'

// Windows and Mac CI are slow, running on Linux only is enough
test('retry timer - proven peer reinsertion', { skip: !isLinux }, async (t) => {
  let calls = 0
  const rt = new RetryTimer(() => calls++, {
    backoffs: BACKOFFS,
    jitter: MAX_JITTER
  })

  const peerInfo = randomPeerInfo()

  rt.add(peerInfo)

  const msMargin = 50
  await timeout(BACKOFFS[0] + MAX_JITTER + msMargin)
  t.is(calls, 1)

  setQuickRetry(peerInfo)
  rt.add(peerInfo)

  await timeout(BACKOFFS[0] + MAX_JITTER + msMargin)

  t.is(calls, 2)

  rt.destroy()
})

test('retry timer - forget unresponsive', async (t) => {
  let calls = 0
  const rt = new RetryTimer(() => calls++, {
    backoffs: BACKOFFS,
    jitter: MAX_JITTER
  })

  const peerInfo = randomPeerInfo()

  rt.add(peerInfo)

  await timeout(BACKOFFS[0] + MAX_JITTER)

  setUnresponsive(peerInfo)
  rt.add(peerInfo)

  await timeout(BACKOFFS[2] + MAX_JITTER)

  t.is(calls, 1) // The second `add` should not trigger any more retries

  rt.destroy()
})

test('retry timer - does not retry banned peers', async (t) => {
  let calls = 0
  const rt = new RetryTimer(() => calls++, {
    backoffs: BACKOFFS,
    jitter: MAX_JITTER
  })

  const peerInfo = randomPeerInfo()
  rt.add(peerInfo)

  await timeout(BACKOFFS[0] + MAX_JITTER)

  peerInfo.ban(true)
  rt.add(peerInfo)

  await timeout(BACKOFFS[2] + MAX_JITTER)

  t.is(calls, 1) // The second `add` should not trigger any more retries

  rt.destroy()
})

function randomPeerInfo () {
  return new PeerInfo({
    publicKey: crypto.randomBytes(32)
  })
}

function setQuickRetry (peerInfo) {
  peerInfo.proven = true
  peerInfo.reconnect(true)
  peerInfo.attempts = 1
}

function setUnresponsive (peerInfo) {
  peerInfo.proven = false
  peerInfo.reconnect(true)
  peerInfo.attempts = 4
}
