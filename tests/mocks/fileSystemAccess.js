export class MockDirectoryHandle {
  constructor({ permissionGranted = true } = {}) {
    this.files = {}
    this._permission = permissionGranted ? 'granted' : 'denied'
  }
  async queryPermission() { return this._permission }
  async requestPermission() { return this._permission }
  async getFileHandle(name) { return new MockFileHandle(this, name) }
}

class MockFileHandle {
  constructor(dir, name) { this.dir = dir; this.name = name }
  async createWritable() { return new MockWritable(this.dir, this.name) }
}

class MockWritable {
  constructor(dir, name) { this.dir = dir; this.name = name; this._buf = [] }
  async write(data) { this._buf.push(data) }
  async close() { this.dir.files[this.name] = this._buf.join('') }
}

export function mockPicker(handle) {
  return async () => handle
}

export function mockPickerCancelled() {
  return async () => { const e = new Error('cancelled'); e.name = 'AbortError'; throw e }
}
