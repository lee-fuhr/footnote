import { getLocationStatus } from './staleness.js'
import { logger } from '../logger.js'

let _watchId = null
let _permissionStatus = 'unknown'
let _acquiring = false
let _anchorPollerId = null

let _position = {
  lat: null,
  lng: null,
  accuracy: null,
  capturedAt: null,
}

function onPositionUpdate(pos) {
  _acquiring = false
  _position = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: Math.round(pos.coords.accuracy),
    capturedAt: Date.now(),
  }
  logger.info('gps', 'position_update', { lat: _position.lat, lng: _position.lng, accuracy: _position.accuracy })
}

function onPositionError(err) {
  _acquiring = false
  logger.warn('gps', 'position_error', { code: err.code, message: err.message })
}

/** Starts watching GPS. Returns 'granted' | 'denied' | 'timeout'. */
export function startWatching() {
  _acquiring = true
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        onPositionUpdate(pos)
        _watchId = navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 30000,
        })
        _permissionStatus = 'granted'
        localStorage.setItem('gps_permission', 'granted')
        resolve('granted')
      },
      err => {
        _acquiring = false
        _permissionStatus = err.code === 1 ? 'denied' : 'unknown'
        localStorage.setItem('gps_permission', _permissionStatus)
        resolve(err.code === 1 ? 'denied' : 'timeout')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  })
}

export function stopWatching() {
  if (_watchId !== null) {
    navigator.geolocation.clearWatch(_watchId)
    _watchId = null
  }
}

/** Returns current location snapshot for attaching to a line. */
export function getLineLocation() {
  if (_position.capturedAt === null) {
    return { location: null, locationStatus: 'unavailable' }
  }
  const status = getLocationStatus(_position.capturedAt)
  return {
    location: { ..._position },
    locationStatus: status,
  }
}

export function getPermissionStatus() { return _permissionStatus }

/**
 * Starts a 60-second interval that snapshots the current GPS position and
 * passes it to `callback`. Replaces any existing poller.
 *
 * @param callback - called with {lat, lng, accuracy, timestamp}
 * @param options.intervalMs - polling interval (default 60 000)
 * @param options.positionFn - override position source (for testing)
 */
export function startAnchorPoller(callback, { intervalMs = 60000, positionFn = null } = {}) {
  if (_anchorPollerId !== null) clearInterval(_anchorPollerId)
  const getPos = positionFn ?? (() => (_position.capturedAt !== null ? _position : null))
  _anchorPollerId = setInterval(() => {
    const pos = getPos()
    if (!pos) return
    callback({ lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy, timestamp: Date.now() })
  }, intervalMs)
}

export function stopAnchorPoller() {
  if (_anchorPollerId !== null) {
    clearInterval(_anchorPollerId)
    _anchorPollerId = null
  }
}

/** Returns CSS dot class: 'gps-acquiring' | 'gps-live' | 'gps-live-low' | 'gps-stale' | 'gps-unavailable' */
export function getIndicatorClass() {
  if (_acquiring) return 'gps-acquiring'
  if (_position.capturedAt === null) return 'gps-unavailable'
  const status = getLocationStatus(_position.capturedAt)
  if (status === 'stale') return 'gps-stale'
  return _position.accuracy < 20 ? 'gps-live' : 'gps-live-low'
}
