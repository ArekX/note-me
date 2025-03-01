const languages = [
    { name: "1C", alias: ["1c"] },
    { name: "ABNF", alias: ["abnf"] },
    { name: "Access logs", alias: ["accesslog"] },
    { name: "Ada", alias: ["ada"] },
    { name: "Arduino (C++ w/Arduino libs)", alias: ["arduino", "ino"] },
    { name: "ARM assembler", alias: ["armasm", "arm"] },
    { name: "AVR assembler", alias: ["avrasm"] },
    { name: "ActionScript", alias: ["actionscript", "as"] },
    { name: "AngelScript", alias: ["angelscript", "asc"] },
    { name: "Apache", alias: ["apache", "apacheconf"] },
    { name: "AppleScript", alias: ["applescript", "osascript"] },
    { name: "Arcade", alias: ["arcade"] },
    { name: "AsciiDoc", alias: ["asciidoc", "adoc"] },
    { name: "AspectJ", alias: ["aspectj"] },
    { name: "AutoHotkey", alias: ["autohotkey"] },
    { name: "AutoIt", alias: ["autoit"] },
    { name: "Awk", alias: ["awk", "mawk", "nawk", "gawk"] },
    { name: "Bash", alias: ["bash", "sh", "zsh"] },
    { name: "Basic", alias: ["basic"] },
    { name: "BNF", alias: ["bnf"] },
    { name: "Brainfuck", alias: ["brainfuck", "bf"] },
    { name: "C#", alias: ["csharp", "cs"] },
    { name: "C", alias: ["c", "h"] },
    {
        name: "C++",
        alias: ["cpp", "hpp", "cc", "hh", "c++", "h++", "cxx", "hxx"],
    },
    { name: "C/AL", alias: ["cal"] },
    { name: "Cache Object Script", alias: ["cos", "cls"] },
    { name: "CMake", alias: ["cmake", "cmake.in"] },
    { name: "Coq", alias: ["coq"] },
    { name: "CSP", alias: ["csp"] },
    { name: "CSS", alias: ["css"] },
    { name: "Cap’n Proto", alias: ["capnproto", "capnp"] },
    { name: "Clojure", alias: ["clojure", "clj"] },
    { name: "CoffeeScript", alias: ["coffeescript", "coffee", "cson", "iced"] },
    { name: "Crmsh", alias: ["crmsh", "crm", "pcmk"] },
    { name: "Crystal", alias: ["crystal", "cr"] },
    { name: "D", alias: ["d"] },
    { name: "Dart", alias: ["dart"] },
    { name: "Delphi", alias: ["dpr", "dfm", "pas", "pascal"] },
    { name: "Diff", alias: ["diff", "patch"] },
    { name: "Django", alias: ["django", "jinja"] },
    { name: "DNS Zone file", alias: ["dns", "zone", "bind"] },
    { name: "Dockerfile", alias: ["dockerfile", "docker"] },
    { name: "DOS", alias: ["dos", "bat", "cmd"] },
    { name: "dsconfig", alias: ["dsconfig"] },
    { name: "DTS (Device Tree)", alias: ["dts"] },
    { name: "Dust", alias: ["dust", "dst"] },
    { name: "EBNF", alias: ["ebnf"] },
    { name: "Elixir", alias: ["elixir"] },
    { name: "Elm", alias: ["elm"] },
    { name: "Erlang", alias: ["erlang", "erl"] },
    { name: "Excel", alias: ["excel", "xls", "xlsx"] },
    { name: "F#", alias: ["fsharp", "fs", "fsx", "fsi", "fsscript"] },
    { name: "FIX", alias: ["fix"] },
    { name: "Fortran", alias: ["fortran", "f90", "f95"] },
    { name: "G-Code", alias: ["gcode", "nc"] },
    { name: "Gams", alias: ["gams", "gms"] },
    { name: "GAUSS", alias: ["gauss", "gss"] },
    { name: "Gherkin", alias: ["gherkin"] },
    { name: "Go", alias: ["go", "golang"] },
    { name: "Golo", alias: ["golo", "gololang"] },
    { name: "Gradle", alias: ["gradle"] },
    { name: "GraphQL", alias: ["graphql", "gql"] },
    { name: "Groovy", alias: ["groovy"] },
    {
        name: "HTML, XML",
        alias: [
            "xml",
            "html",
            "xhtml",
            "rss",
            "atom",
            "xjb",
            "xsd",
            "xsl",
            "plist",
            "svg",
        ],
    },
    { name: "HTTP", alias: ["http", "https"] },
    { name: "Haml", alias: ["haml"] },
    {
        name: "Handlebars",
        alias: ["handlebars", "hbs", "html.hbs", "html.handlebars"],
    },
    { name: "Haskell", alias: ["haskell", "hs"] },
    { name: "Haxe", alias: ["haxe", "hx"] },
    { name: "Hy", alias: ["hy", "hylang"] },
    { name: "Ini, TOML", alias: ["ini", "toml"] },
    { name: "Inform7", alias: ["inform7", "i7"] },
    { name: "IRPF90", alias: ["irpf90"] },
    { name: "JSON", alias: ["json", "jsonc"] },
    { name: "Java", alias: ["java", "jsp"] },
    { name: "JavaScript", alias: ["javascript", "js", "jsx"] },
    { name: "Julia", alias: ["julia", "jl"] },
    { name: "Julia REPL", alias: ["julia-repl"] },
    { name: "Kotlin", alias: ["kotlin", "kt"] },
    { name: "LaTeX", alias: ["tex"] },
    { name: "Leaf", alias: ["leaf"] },
    { name: "Lasso", alias: ["lasso", "ls", "lassoscript"] },
    { name: "Less", alias: ["less"] },
    { name: "LDIF", alias: ["ldif"] },
    { name: "Lisp", alias: ["lisp"] },
    { name: "LiveCode Server", alias: ["livecodeserver"] },
    { name: "LiveScript", alias: ["livescript", "ls"] },
    { name: "Lua", alias: ["lua"] },
    { name: "Makefile", alias: ["makefile", "mk", "mak", "make"] },
    { name: "Markdown", alias: ["markdown", "md", "mkdown", "mkd"] },
    { name: "Mathematica", alias: ["mathematica", "mma", "wl"] },
    { name: "Matlab", alias: ["matlab"] },
    { name: "Maxima", alias: ["maxima"] },
    { name: "Maya Embedded Language", alias: ["mel"] },
    { name: "Mercury", alias: ["mercury"] },
    { name: "MIPS Assembler", alias: ["mips", "mipsasm"] },
    { name: "Mizar", alias: ["mizar"] },
    { name: "Mojolicious", alias: ["mojolicious"] },
    { name: "Monkey", alias: ["monkey"] },
    { name: "Moonscript", alias: ["moonscript", "moon"] },
    { name: "N1QL", alias: ["n1ql"] },
    { name: "NSIS", alias: ["nsis"] },
    { name: "Nginx", alias: ["nginx", "nginxconf"] },
    { name: "Nim", alias: ["nim", "nimrod"] },
    { name: "Nix", alias: ["nix"] },
    { name: "OCaml", alias: ["ocaml", "ml"] },
    {
        name: "Objective C",
        alias: [
            "objectivec",
            "mm",
            "objc",
            "obj-c",
            "obj-c++",
            "objective-c++",
        ],
    },
    { name: "OpenGL Shading Language", alias: ["glsl"] },
    { name: "OpenSCAD", alias: ["openscad", "scad"] },
    { name: "Oracle Rules Language", alias: ["ruleslanguage"] },
    { name: "Oxygene", alias: ["oxygene"] },
    { name: "PF", alias: ["pf", "pf.conf"] },
    { name: "PHP", alias: ["php"] },
    { name: "Parser3", alias: ["parser3"] },
    { name: "Perl", alias: ["perl", "pl", "pm"] },
    { name: "Plaintext", alias: ["plaintext", "txt", "text"] },
    { name: "Pony", alias: ["pony"] },
    {
        name: "PostgreSQL & PL/pgSQL",
        alias: ["pgsql", "postgres", "postgresql"],
    },
    { name: "PowerShell", alias: ["powershell", "ps", "ps1"] },
    { name: "Processing", alias: ["processing"] },
    { name: "Prolog", alias: ["prolog"] },
    { name: "Properties", alias: ["properties"] },
    { name: "Protocol Buffers", alias: ["proto", "protobuf"] },
    { name: "Puppet", alias: ["puppet", "pp"] },
    { name: "Python", alias: ["python", "py", "gyp"] },
    { name: "Python profiler results", alias: ["profile"] },
    { name: "Python REPL", alias: ["python-repl", "pycon"] },
    { name: "Q", alias: ["k", "kdb"] },
    { name: "QML", alias: ["qml"] },
    { name: "R", alias: ["r"] },
    { name: "ReasonML", alias: ["reasonml", "re"] },
    { name: "RenderMan RIB", alias: ["rib"] },
    { name: "RenderMan RSL", alias: ["rsl"] },
    { name: "Roboconf", alias: ["graph", "instances"] },
    {
        name: "Ruby",
        alias: ["ruby", "rb", "gemspec", "podspec", "thor", "irb"],
    },
    { name: "Rust", alias: ["rust", "rs"] },
    { name: "SAS", alias: ["SAS", "sas"] },
    { name: "SCSS", alias: ["scss"] },
    { name: "SQL", alias: ["sql"] },
    { name: "STEP Part 21", alias: ["p21", "step", "stp"] },
    { name: "Scala", alias: ["scala"] },
    { name: "Scheme", alias: ["scheme"] },
    { name: "Scilab", alias: ["scilab", "sci"] },
    { name: "Shell", alias: ["shell", "console"] },
    { name: "Smali", alias: ["smali"] },
    { name: "Smalltalk", alias: ["smalltalk", "st"] },
    { name: "SML", alias: ["sml", "ml"] },
    { name: "Stan", alias: ["stan", "stanfuncs"] },
    { name: "Stata", alias: ["stata"] },
    { name: "Stylus", alias: ["stylus", "styl"] },
    { name: "SubUnit", alias: ["subunit"] },
    { name: "Swift", alias: ["swift"] },
    { name: "Tcl", alias: ["tcl", "tk"] },
    { name: "Test Anything Protocol", alias: ["tap"] },
    { name: "Thrift", alias: ["thrift"] },
    { name: "TP", alias: ["tp"] },
    { name: "Twig", alias: ["twig", "craftcms"] },
    { name: "TypeScript", alias: ["typescript", "ts", "tsx", "mts", "cts"] },
    { name: "VB.Net", alias: ["vbnet", "vb"] },
    { name: "VBScript", alias: ["vbscript", "vbs"] },
    { name: "VHDL", alias: ["vhdl"] },
    { name: "Vala", alias: ["vala"] },
    { name: "Verilog", alias: ["verilog", "v"] },
    { name: "Vim Script", alias: ["vim"] },
    { name: "X++", alias: ["axapta", "x++"] },
    { name: "x86 Assembly", alias: ["x86asm"] },
    { name: "XL", alias: ["xl", "tao"] },
    { name: "XQuery", alias: ["xquery", "xpath", "xq", "xqm"] },
    { name: "YAML", alias: ["yml", "yaml"] },
    { name: "Zephir", alias: ["zephir", "zep"] },
];

const orText = " OR ";

export default function SupportedLanguageHighlights() {
    return (
        <div class="p-2">
            <h2 class="text-lg font-bold">
                Supported languages in code blocks
            </h2>

            <p class="py-2">
                Following table contains all aliases for which code highlighting
                is supported in NoteMe.
            </p>

            <table>
                <thead>
                    <tr>
                        <th>Language</th>
                        <th>Name to use in code block</th>
                    </tr>
                </thead>
                <tbody>
                    {languages.map((language) => (
                        <tr>
                            <td>
                                {language.name}
                            </td>
                            <td class="w-2/5">
                                {language.alias.map((alias, index) => (
                                    <>
                                        <pre class="inline">{alias}</pre>
                                        {index !== language.alias.length - 1
                                            ? <strong>{orText}</strong>
                                            : ""}
                                    </>
                                ))}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
