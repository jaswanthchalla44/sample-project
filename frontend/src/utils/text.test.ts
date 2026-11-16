import { markdownToPlainText, previewText } from "./text";

describe("markdownToPlainText", () => {
  it("strips common markdown syntax", () => {
    const md = "# Title\n\n**bold** and *em* with `code` and [a link](http://x.test)\n\n- item one\n> quoted";
    expect(markdownToPlainText(md)).toBe("Title bold and em with code and a link item one quoted");
  });

  it("drops fenced code blocks", () => {
    expect(markdownToPlainText("before\n```js\nconst x = 1;\n```\nafter")).toBe("before after");
  });
});

describe("previewText", () => {
  it("truncates long bodies to about 150 characters with an ellipsis", () => {
    const preview = previewText("a".repeat(400));
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(151);
  });

  it("returns short bodies unchanged", () => {
    expect(previewText("Short note")).toBe("Short note");
  });
});
