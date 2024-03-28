import { parse, fragment, serialize, serializeOuter } from "@begin/parse5";
import { customAlphabet } from "nanoid";
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet, 7);

const encodemap = {};
let encodeplace = 0;
export function encode(value) {
  if (typeof value == "string") {
    return value;
  } else if (typeof value == "number") {
    return value;
  } else {
    const id = `__b_${encodeplace++}`;
    encodemap[id] = value;
    return id;
  }
}

export function decode(value) {
  return value.startsWith("__b_") ? encodemap[value] : value;
}

const regex =
  /^[a-z](?:[\.0-9_a-z\xB7\xC0-\xD6\xD8-\xF6\xF8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])*-(?:[\x2D\.0-9_a-z\xB7\xC0-\xD6\xD8-\xF6\xF8-\u037D\u037F-\u1FFF\u200C\u200D\u203F\u2040\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]|[\uD800-\uDB7F][\uDC00-\uDFFF])*$/;
const reservedTags = [
  "annotation-xml",
  "color-profile",
  "font-face",
  "font-face-src",
  "font-face-uri",
  "font-face-format",
  "font-face-name",
  "missing-glyph",
];
const notReservedTag = (tagName) => reservedTags.indexOf(tagName) === -1;

function isCustomElement(tagName) {
  return regex.test(tagName) && notReservedTag(tagName);
}

const walk = (node, callback) => {
  if (callback(node) === false) {
    return false;
  } else {
    let childNode;
    let i;
    if (node.childNodes !== undefined) {
      i = 0;
      childNode = node.childNodes[i];
    }

    while (childNode !== undefined) {
      if (walk(childNode, callback) === false) {
        return false;
      } else {
        childNode = node.childNodes[++i];
      }
    }
  }
};

export default function Enhance(options = {}) {
  const {
    bodyContent = false,
    elements = [],
    enhancedAttr = true,
    initialState = {},
    shadowStylesheets = [],
    uuidFunction = nanoid,
  } = options;

  const store = Object.assign({}, initialState);

  function processCustomElements({ node }) {
    const context = {};

    walk(node, (child) => {
      if (isCustomElement(child.tagName)) {
        if (elements[child.tagName]) {
          const rendered = renderTemplate({
            name: child.tagName,
            elements,
            attrs: node.attrs,
            state: {
              context,
              instanceID: uuidFunction(),
              store,
            },
          });
          const t = fragment(`
            <template shadowrootmode="open">
              ${
                shadowStylesheets.length
                  ? shadowStylesheets
                      .map(
                        (s) =>
                          `<link rel="stylesheet" href="${s?.href || ""}">`,
                      )
                      ?.join("\n")
                  : ""
              }
              ${rendered}
            </template>
          `);
          child.childNodes.unshift(...t.childNodes);
        }

        if (enhancedAttr) {
          child.attrs.push({ name: "enhanced", value: "✨" });
        }
      }
    });
  }

  function attrsToState(attrs = [], obj = {}) {
    [...attrs].forEach((attr) => (obj[attr.name] = decode(attr.value)));
    return obj;
  }

  function render(strings, ...values) {
    const collect = [];
    for (let i = 0; i < strings.length - 1; i++) {
      collect.push(strings[i], encode(values[i]));
    }
    collect.push(strings[strings.length - 1]);
    return collect.join("");
  }

  function renderTemplate({ name, elements, attrs = [], state = {} }) {
    attrs = attrs ? attrsToState(attrs) : {};
    state.attrs = attrs;
    const templateRenderFunction =
      elements[name]?.render || elements[name]?.prototype?.render;
    const template = templateRenderFunction
      ? templateRenderFunction
      : elements[name];

    if (template && typeof template === "function") {
      const templateDocument = template({ html: render, state });
      const document = parseAndProcess(templateDocument);
      const out = serialize(document);
      return out;
    } else {
      throw new Error(`Could not find the template function for ${name}`);
    }
  }

  function parseAndProcess(markup) {
    const document = parse(markup);
    processCustomElements({ node: document });
    return document;
  }

  function html(strings, ...values) {
    const document = parseAndProcess(render(strings, ...values));
    const html = document.childNodes.find((node) => node.tagName === "html");
    const body = html.childNodes.find((node) => node.tagName === "body");
    return (
      bodyContent ? serializeOuter(body.childNodes[0]) : serialize(document)
    ).replace(/__b_\d+/g, "");
  }

  return html;
}
