import { Marked } from "../deps.frontend.ts";

// Marked.setOptions({
//   sanitize: true,
// });

// // const markdownRenderer = markdownit({
// //   html: false,
// //   xhtmlOut: false,
// //   breaks: true,
// //   langPrefix: "language-",
// //   linkify: false,
// //   typographer: false,
// //   quotes: "“”‘’",
// // });

export type ViewerProps = {
  markdownText: string;
};

export default function Viewer({ markdownText = "" }: ViewerProps) {
  const result = Marked.parse(markdownText, {
    sanitize: true,
    tables: true,

  });

  return (
    <div
      class="markdown-viewer"
      style={{ all: "initial" }}
      dangerouslySetInnerHTML={{ __html: result }}
    />
  );
}
