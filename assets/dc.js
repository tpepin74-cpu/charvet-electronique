/* Mini-runtime autonome pour les composants .dc.html (export statique Charvet Électronique) */
(function () {
  var h = React.createElement;
  var TPL = {}, LOGIC = {}, COMP = {};

  var ATTR = {
    'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength',
    minlength: 'minLength', autocomplete: 'autoComplete', autofocus: 'autoFocus', colspan: 'colSpan', rowspan: 'rowSpan',
    crossorigin: 'crossOrigin', srcset: 'srcSet', playsinline: 'playsInline', autoplay: 'autoPlay', novalidate: 'noValidate',
    inputmode: 'inputMode', enterkeyhint: 'enterKeyHint', spellcheck: 'spellCheck', datetime: 'dateTime',
    contenteditable: 'contentEditable', referrerpolicy: 'referrerPolicy', fetchpriority: 'fetchPriority',
    'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace', accesskey: 'accessKey', enctype: 'encType', formnovalidate: 'formNoValidate'
  };
  var BOOL = { disabled: 1, required: 1, hidden: 1, checked: 1, multiple: 1, selected: 1, open: 1, novalidate: 1, readonly: 1, autoplay: 1, muted: 1, loop: 1, playsinline: 1, controls: 1, defer: 1, async: 1, autofocus: 1 };
  var EVENTS = ['Click', 'Change', 'Submit', 'Input', 'KeyDown', 'KeyUp', 'Focus', 'Blur', 'MouseEnter', 'MouseLeave',
    'MouseDown', 'MouseUp', 'MouseMove', 'PointerDown', 'PointerUp', 'PointerEnter', 'PointerLeave', 'PointerMove',
    'TouchStart', 'TouchEnd', 'Scroll', 'Wheel', 'Load', 'Error', 'DoubleClick', 'ContextMenu', 'Toggle', 'AnimationEnd', 'TransitionEnd'];
  var EVMAP = {}; EVENTS.forEach(function (e) { EVMAP['on' + e.toLowerCase()] = 'on' + e; }); EVMAP.ondblclick = 'onDoubleClick';

  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }

  function lookup(expr, scope) {
    expr = expr.trim();
    if (expr === 'true') return true; if (expr === 'false') return false;
    if (expr === 'null') return null; if (expr === 'undefined') return undefined;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    if (/^(['"]).*\1$/.test(expr)) return expr.slice(1, -1);
    var parts = expr.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  var WHOLE = /^\s*\{\{([^}]*)\}\}\s*$/, ANY = /\{\{([^}]*)\}\}/g;
  function val(str, scope) {
    var m = WHOLE.exec(str); if (m) return lookup(m[1], scope);
    if (str.indexOf('{{') < 0) return str;
    return str.replace(ANY, function (_, e) { var v = lookup(e, scope); return v == null ? '' : String(v); });
  }
  function styleObj(s) {
    if (s == null || s === '') return undefined;
    if (typeof s === 'object') return s;
    var out = {}, depth = 0, cur = '', parts = [];
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '(') depth++; else if (c === ')') depth--;
      if (c === ';' && depth === 0) { parts.push(cur); cur = ''; } else cur += c;
    }
    parts.push(cur);
    parts.forEach(function (p) {
      var k = p.indexOf(':'); if (k < 0) return;
      var name = p.slice(0, k).trim(), v = p.slice(k + 1).trim(); if (!name) return;
      if (name.indexOf('--') !== 0) name = camel(name.replace(/^-ms-/, 'ms-'));
      out[name] = v;
    });
    return out;
  }

  function renderList(nodes, scope, keyBase) {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var r = renderNode(nodes[i], scope, keyBase + '.' + i);
      if (r === null || r === undefined || r === false) continue;
      if (Array.isArray(r)) out.push.apply(out, r); else out.push(r);
    }
    return out;
  }

  function renderNode(node, scope, key) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      if (t.indexOf('{{') < 0) return t;
      var m = WHOLE.exec(t);
      if (m) { var v = lookup(m[1], scope); return v == null || v === false ? null : (typeof v === 'object' && v.$$typeof ? v : String(v)); }
      return val(t, scope);
    }
    if (node.nodeType !== 1) return null;
    var tag = node.localName;
    if (tag === 'sc-if') {
      var cond = val(node.getAttribute('value') || '', scope);
      return cond ? h(React.Fragment, { key: key }, renderList(node.childNodes, scope, key)) : null;
    }
    if (tag === 'sc-for') {
      var list = val(node.getAttribute('list') || '', scope) || [];
      var as = node.getAttribute('as') || 'item';
      return h(React.Fragment, { key: key }, list.map(function (item, idx) {
        var s = Object.create(scope); s[as] = item; s.$index = idx;
        var k = item && typeof item === 'object' && (item.key != null ? item.key : item.id);
        return h(React.Fragment, { key: k != null ? k : idx }, renderList(node.childNodes, s, key + '.' + idx));
      }));
    }
    if (tag === 'dc-import') {
      var name = node.getAttribute('name'), cp = { key: key };
      for (var a = 0; a < node.attributes.length; a++) {
        var at = node.attributes[a];
        if (at.name === 'name' || at.name.indexOf('hint-') === 0) continue;
        cp[camel(at.name)] = val(at.value, scope);
      }
      return COMP[name] ? h(COMP[name], cp) : null;
    }
    var props = { key: key }, isSvg = node.namespaceURI === 'http://www.w3.org/2000/svg';
    for (var j = 0; j < node.attributes.length; j++) {
      var attr = node.attributes[j], n = attr.name, lv = n.toLowerCase();
      if (lv.indexOf('hint-') === 0) continue;
      var v2 = val(attr.value, scope);
      if (lv === 'style') { props.style = styleObj(v2); continue; }
      if (EVMAP[lv]) { props[EVMAP[lv]] = v2; continue; }
      if (lv === 'ref' || lv === 'key') { props[lv] = v2; continue; }
      if (ATTR[lv]) n = ATTR[lv];
      else if (isSvg && n.indexOf('-') > 0 && n.indexOf('aria-') !== 0 && n.indexOf('data-') !== 0) n = camel(n);
      if (BOOL[lv] && attr.value === '') v2 = true;
      props[n] = v2;
    }
    var ctrl = props.onChange || props.onInput;
    if ((tag === 'input' || tag === 'textarea' || tag === 'select')) {
      if ('value' in props && !ctrl) { props.defaultValue = props.value; delete props.value; }
      if ('checked' in props && !ctrl) { props.defaultChecked = props.checked; delete props.checked; }
      if ('value' in props && props.value == null) props.value = '';
      if (tag === 'textarea') return h(tag, props);
    }
    if (/^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/.test(tag)) return h(tag, props);
    var kids = renderList((tag === 'template' ? node.content : node).childNodes, scope, key);
    return h.apply(null, [tag, props].concat(kids.length ? [kids] : []));
  }

  function DCLogic(props) { React.Component.call(this, props); this.state = this.state || {}; }
  DCLogic.prototype = Object.create(React.Component.prototype);
  DCLogic.prototype.constructor = DCLogic;
  Object.setPrototypeOf(DCLogic, React.Component);

  function define(name, def) {
    var tpl = document.createElement('template');
    tpl.innerHTML = def.html;
    var Logic;
    try { Logic = new Function('DCLogic', 'React', def.js + '\n;return typeof Component!=="undefined"?Component:null;')(DCLogic, React); }
    catch (e) { console.error('[dc] ' + name, e); }
    if (!Logic) Logic = function (p) { DCLogic.call(this, p); }, Logic.prototype = Object.create(DCLogic.prototype);
    var nodes = tpl.content.childNodes;
    var Comp = class extends Logic {
      render() {
        var vals = (this.renderVals ? this.renderVals() : {}) || {};
        var scope = Object.assign({}, this.props, vals);
        return h(React.Fragment, null, renderList(nodes, scope, name));
      }
    };
    Comp.displayName = name;
    Comp.defaultProps = def.defaults || {};
    COMP[name] = Comp;
  }

  window.DC = {
    mount: function (defs, root) {
      Object.keys(defs).forEach(function (k) { define(k, defs[k]); });
      ReactDOM.createRoot(document.getElementById('root')).render(h(COMP[root]));
    }
  };
})();
