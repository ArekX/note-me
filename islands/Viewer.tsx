import { markdownit } from "../deps.frontend.ts";

const markdownRenderer = markdownit({
  html: false,
  xhtmlOut: false,
  breaks: true,
  langPrefix: "language-",
  linkify: true,
  typographer: false,
  quotes: "“”‘’",
});

export type ViewerProps = {
  markdownText: string;
};

export default function Viewer({ markdownText = "" }: ViewerProps) {
  const result = markdownRenderer.render(markdownText);

  return (
    <div
      class="markdown-viewer"
      style={{ all: "initial" }}
      dangerouslySetInnerHTML={{ __html: result }}
    />
  );
}
