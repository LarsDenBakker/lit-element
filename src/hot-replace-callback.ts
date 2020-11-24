import { LitElement } from "./lit-element.js";

interface Constructor<T> {
  new (): T;
}

function updateObjectMembers(
  hmrClass: Constructor<LitElement>,
  newClass: Constructor<LitElement>
) {
  const currentProperties = new Set(Object.getOwnPropertyNames(hmrClass));
  const newProperties = new Set(Object.getOwnPropertyNames(newClass));

  for (const prop of Object.getOwnPropertyNames(newClass)) {
    const descriptor = Object.getOwnPropertyDescriptor(newClass, prop);
    if (descriptor && descriptor.configurable) {
      Object.defineProperty(hmrClass, prop, descriptor);
    }
  }

  for (const existingProp of currentProperties) {
    if (!newProperties.has(existingProp)) {
      try {
        delete (hmrClass as any)[existingProp];
      } catch {}
    }
  }
}

const supportsAdoptingStyleSheets =
  window.ShadowRoot &&
  (window.ShadyCSS === undefined || window.ShadyCSS.nativeShadow) &&
  "adoptedStyleSheets" in Document.prototype &&
  "replace" in CSSStyleSheet.prototype;

// static callback
(LitElement as any).hotReplaceCallback = function hotReplaceCallback(
  newClass: Constructor<LitElement>
) {
  (newClass as any).finalize();
  updateObjectMembers(this, newClass);
  updateObjectMembers(this.prototype, newClass.prototype);
  this.finalize();
};

// instance callback
(LitElement as any).prototype.hotReplaceCallback = function hotReplaceCallback() {
  if (!supportsAdoptingStyleSheets) {
    const nodes = Array.from(this.renderRoot.children) as Element[];

    for (const node of nodes) {
      if (node.tagName && node.tagName.toLowerCase() === "style") {
        node.remove();
      }
    }
  }

  this.constructor._getUniqueStyles();
  if (window.ShadowRoot && this.renderRoot instanceof window.ShadowRoot) {
    this.adoptStyles();
  }
  this.requestUpdate();
};
