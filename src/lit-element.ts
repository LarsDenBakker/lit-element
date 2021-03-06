/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {
  PropertiesChangedConstructor
} from '@polymer/polymer/lib/mixins/properties-changed.js';
import {PropertiesMixin} from '@polymer/polymer/lib/mixins/properties-mixin.js';
import {
  PropertiesMixinConstructor
} from '@polymer/polymer/lib/mixins/properties-mixin.js';
import {camelToDashCase} from '@polymer/polymer/lib/utils/case-map.js';
import {render} from 'lit-html/lib/shady-render.js';
import {TemplateResult} from 'lit-html/lit-html.js';

export {
  PropertiesChangedConstructor
} from '@polymer/polymer/lib/mixins/properties-changed.js';
export {
  PropertiesMixinConstructor
} from '@polymer/polymer/lib/mixins/properties-mixin.js';
export {html, svg} from 'lit-html/lib/lit-extended.js';

// This is a hack to get tsc to not complain about unused interfaces and
// still generate the type declarations properly
export type __unused = PropertiesChangedConstructor&PropertiesMixinConstructor;

/**
 * Renders attributes to the given element based on the `attrInfo` object where
 * boolean values are added/removed as attributes.
 * @param element Element on which to set attributes.
 * @param attrInfo Object describing attributes.
 */
export function renderAttributes(
    element: HTMLElement, attrInfo: {[name: string]: string|boolean|number}) {
  for (const a in attrInfo) {
    const v = attrInfo[a] === true ? '' : attrInfo[a];
    if (v || v === '' || v === 0) {
      if (element.getAttribute(a) !== v) {
        element.setAttribute(a, String(v));
      }
    } else if (element.hasAttribute(a)) {
      element.removeAttribute(a);
    }
  }
}

/**
 * Returns a string of css class names formed by taking the properties
 * in the `classInfo` object and appending the property name to the string of
 * class names if the property value is truthy.
 * @param classInfo
 */
export function classString(
    classInfo: {[name: string]: string|boolean|number}) {
  const o = [];
  for (const name in classInfo) {
    const v = classInfo[name];
    if (v) {
      o.push(name);
    }
  }
  return o.join(' ');
}

/**
 * Returns a css style string formed by taking the properties in the `styleInfo`
 * object and appending the property name (dash-cased) colon the
 * property value. Properties are separated by a semi-colon.
 * @param styleInfo
 */
export function styleString(
    styleInfo: {[name: string]: string|boolean|number}) {
  const o = [];
  for (const name in styleInfo) {
    const v = styleInfo[name];
    if (v || v === 0) {
      o.push(`${camelToDashCase(name)}: ${v}`);
    }
  }
  return o.join('; ');
}

export class LitElement extends PropertiesMixin
(HTMLElement) {

  private __renderComplete: Promise<boolean>|null = null;
  private __resolveRenderComplete: Function|null = null;
  private __isInvalid: Boolean = false;
  private __isChanging: Boolean = false;
  private _root?: Element|DocumentFragment;

  /**
   * Override which sets up element rendering by calling* `_createRoot`
   * and `_firstRendered`.
   */
  ready() {
    this._root = this._createRoot();
    super.ready();
    this._firstRendered();
  }

  /**
   * Called after the element DOM is rendered for the first time.
   * Implement to perform tasks after first rendering like capturing a
   * reference to a static node which must be directly manipulated.
   * This should not be commonly needed. For tasks which should be performed
   * before first render, use the element constructor.
   */
  _firstRendered() {}

  /**
   * Implement to customize where the element's template is rendered by
   * returning an element into which to render. By default this creates
   * a shadowRoot for the element. To render into the element's childNodes,
   * return `this`.
   * @returns {Element|DocumentFragment} Returns a node into which to render.
   */
  protected _createRoot(): Element|DocumentFragment {
    return this.attachShadow({mode : 'open'});
  }

  /**
   * Override which returns the value of `_shouldRender` which users
   * should implement to control rendering. If this method returns false,
   * _propertiesChanged will not be called and no rendering will occur even
   * if property values change or `_requestRender` is called.
   * @param _props Current element properties
   * @param _changedProps Changing element properties
   * @param _prevProps Previous element properties
   * @returns {boolean} Default implementation always returns true.
   */
  _shouldPropertiesChange(_props: object, _changedProps: object,
                          _prevProps: object): boolean {
    const shouldRender = this._shouldRender(_props, _changedProps, _prevProps);
    if (!shouldRender && this.__resolveRenderComplete) {
      this.__resolveRenderComplete(false);
    }
    return shouldRender;
  }

  /**
   * Implement to control if rendering should occur when property values
   * change or `_requestRender` is called. By default, this method always
   * returns true, but this can be customized as an optimization to avoid
   * rendering work when changes occur which should not be rendered.
   * @param _props Current element properties
   * @param _changedProps Changing element properties
   * @param _prevProps Previous element properties
   * @returns {boolean} Default implementation always returns true.
   */
  protected _shouldRender(_props: object, _changedProps: object,
                          _prevProps: object): boolean {
    return true;
  }

  /**
   * Override which performs element rendering by calling
   * `_render`, `_applyRender`, and finally `_didRender`.
   * @param props Current element properties
   * @param changedProps Changing element properties
   * @param prevProps Previous element properties
   */
  _propertiesChanged(props: object, changedProps: object, prevProps: object) {
    super._propertiesChanged(props, changedProps, prevProps);
    const result = this._render(props);
    if (result && this._root !== undefined) {
      this._applyRender(result, this._root!);
    }
    this._didRender(props, changedProps, prevProps);
    if (this.__resolveRenderComplete) {
      this.__resolveRenderComplete(true);
    }
  }

  _flushProperties() {
    this.__isChanging = true;
    this.__isInvalid = false;
    super._flushProperties();
    this.__isChanging = false;
  }

  /**
   * Override which warns when a user attempts to change a property during
   * the rendering lifecycle. This is an anti-pattern and should be avoided.
   * @param property {string}
   * @param value {any}
   * @param old {any}
   */
  // tslint:disable-next-line no-any
  _shouldPropertyChange(property: string, value: any, old: any) {
    const change = super._shouldPropertyChange(property, value, old);
    if (change && this.__isChanging) {
      console.trace(
          `Setting properties in response to other properties changing ` +
          `considered harmful. Setting '${property}' from ` +
          `'${this._getProperty(property)}' to '${value}'.`);
    }
    return change;
  }

  /**
   * Implement to describe the DOM which should be rendered in the element.
   * Ideally, the implementation is a pure function using only props to describe
   * the element template. The implementation must return a `lit-html`
   * TemplateResult. By default this template is rendered into the element's
   * shadowRoot. This can be customized by implementing `_createRoot`. This
   * method must be implemented.
   * @param {*} _props Current element properties
   * @returns {TemplateResult} Must return a lit-html TemplateResult.
   */
  protected _render(_props: object): TemplateResult {
    throw new Error('_render() not implemented');
  }

  /**
   * Renders the given lit-html template `result` into the given `node`.
   * Implement to customize the way rendering is applied. This is should not
   * typically be needed and is provided for advanced use cases.
   * @param result {TemplateResult} `lit-html` template result to render
   * @param node {Element|DocumentFragment} node into which to render
   */
  protected _applyRender(result: TemplateResult,
                         node: Element|DocumentFragment) {
    render(result, node, this.localName!);
  }

  /**
   * Called after element DOM has been rendered. Implement to
   * directly control rendered DOM. Typically this is not needed as `lit-html`
   * can be used in the `_render` method to set properties, attributes, and
   * event listeners. However, it is sometimes useful for calling methods on
   * rendered elements, like calling `focus()` on an element to focus it.
   * @param _props Current element properties
   * @param _changedProps Changing element properties
   * @param _prevProps Previous element properties
   */
  protected _didRender(_props: object, _changedProps: object,
                       _prevProps: object) {}

  /**
   * Call to request the element to asynchronously re-render regardless
   * of whether or not any property changes are pending.
   */
  protected _requestRender() { this._invalidateProperties(); }

  /**
   * Override which provides tracking of invalidated state.
   */
  _invalidateProperties() {
    this.__isInvalid = true;
    super._invalidateProperties();
  }

  /**
   * Returns a promise which resolves after the element next renders.
   * The promise resolves to `true` if the element rendered and `false` if the
   * element did not render.
   * This is useful when users (e.g. tests) need to react to the rendered state
   * of the element after a change is made.
   * This can also be useful in event handlers if it is desireable to wait
   * to send an event until after rendering. If possible implement the
   * `_didRender` method to directly respond to rendering within the
   * rendering lifecycle.
   */
  get renderComplete() {
    if (!this.__renderComplete) {
      this.__renderComplete = new Promise((resolve) => {
        this.__resolveRenderComplete = (value: boolean) => {
          this.__resolveRenderComplete = this.__renderComplete = null;
          resolve(value);
        };
      });
      if (!this.__isInvalid && this.__resolveRenderComplete) {
        Promise.resolve().then(() => this.__resolveRenderComplete!(false));
      }
    }
    return this.__renderComplete;
  }
}
