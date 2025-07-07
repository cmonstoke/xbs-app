/**
 * Angular setup for Manifest V3 Service Worker
 * This handles the initialization of Angular modules in the service worker context
 */

// Note: This is a placeholder for Angular setup in service worker
// In Manifest V3, service workers don't have DOM access, so traditional Angular
// bootstrap methods won't work. You'll need to refactor your background logic
// to work without Angular or use a different approach.

// For now, we'll set up a minimal module system that can handle
// the background functionality without full Angular

const ServiceWorkerModules = {
  services: new Map(),
  
  register(name: string, service: any) {
    this.services.set(name, service);
  },
  
  get(name: string) {
    return this.services.get(name);
  }
};

// Mock Angular-like promise for compatibility
class MockPromise<T> implements PromiseLike<T> {
  private promise: Promise<T>;
  
  constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
    this.promise = new Promise(executor);
  }
  
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }
  
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ): PromiseLike<T | TResult> {
    return this.promise.catch(onrejected);
  }
  
  finally(onfinally?: (() => void) | undefined | null): PromiseLike<T> {
    return this.promise.finally(onfinally);
  }
  
  static resolve<T>(value: T | PromiseLike<T>): MockPromise<T> {
    return new MockPromise((resolve) => resolve(value));
  }
  
  static reject<T = never>(reason?: any): MockPromise<T> {
    return new MockPromise((_, reject) => reject(reason));
  }
  
  static all<T>(values: readonly (T | PromiseLike<T>)[]): MockPromise<T[]> {
    return new MockPromise((resolve, reject) => {
      Promise.all(values).then(resolve).catch(reject);
    });
  }
}

// Mock $q service for compatibility
const $q = {
  resolve: <T>(value: T) => MockPromise.resolve(value),
  reject: <T>(reason: any) => MockPromise.reject<T>(reason),
  all: <T>(promises: PromiseLike<T>[]) => MockPromise.all(promises),
  defer: <T>() => {
    let resolve: (value: T) => void;
    let reject: (reason: any) => void;
    const promise = new MockPromise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return {
      promise,
      resolve: resolve!,
      reject: reject!
    };
  }
};

// Register the mock services
ServiceWorkerModules.register('$q', $q);

// Mock storage service for service worker
const StorageService = {
  async init() {
    // Initialize storage in service worker context
    return true;
  },
  
  async get(key: string) {
    const result = await browser.storage.local.get(key);
    return result[key];
  },
  
  async set(key: string, value: any) {
    await browser.storage.local.set({ [key]: value });
  },
  
  async remove(key: string) {
    await browser.storage.local.remove(key);
  }
};

ServiceWorkerModules.register('StorageService', StorageService);

// Export for use in service worker
self.ServiceWorkerModules = ServiceWorkerModules;
self.$q = $q;

export { ServiceWorkerModules, $q };
