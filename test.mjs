import test from "tape";
import enhance from "./index.mjs";
import MyArticle from "./elements/my-article.mjs";
import MyComposite from "./elements/my-composite.mjs";
import MyHeader from "./elements/my-header.mjs";
import MyFooter from "./elements/my-footer.mjs";

const strip = (str) => str.replace(/\r?\n|\r|\s\s+/g, "");

test("Enhance DSD", (t) => {
  t.ok(enhance(), "it lives!");
  t.end();
});

test("Should add declarative shadow dom", (t) => {
  const html = enhance({
    bodyContent: true,
    elements: {
      "my-article": MyArticle,
    },
  });
  const actual = html`
    <my-article>
      <p slot="content">authored content</p>
    </my-article>
  `;
  const expected = `
  <my-article enhanced="✨"><template shadowrootmode="open">
    <style>
      p {
        padding: 2rem;
        border: 1px solid;
        border-radius: 2px;
      }
    </style>
    <article>
      <slot name="content">
        <p>I'm in the shadow DOM.</p>
      </slot>
    </article></template>
  <p slot="content">
    authored content
  </p>
</my-article>
`;
  t.equal(strip(actual), strip(expected), "Expands DSD");
  t.end();
});

test("Should append templates to nested slements", (t) => {
  const html = enhance({
    bodyContent: true,
    elements: {
      "my-composite": MyComposite,
      "my-header": MyHeader,
      "my-footer": MyFooter,
    },
  });
  const actual = html` <my-composite></my-composite> `;
  const expected = `
  <my-composite enhanced="✨"><template shadowrootmode="open">
      <my-header enhanced="✨"><template shadowrootmode="open">
          <header>
            <slot></slot>
          </header></template>
      </my-header>
      <my-footer enhanced="✨"><template shadowrootmode="open">
          <footer>
            <slot></slot>
          </footer>
        </template>
      </my-footer></template>
  </my-composite>
  `;
  t.equal(
    strip(actual),
    strip(expected),
    "Appends template to nested elements",
  );
  t.end();
});
