'use client';

import { useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Eye, Download, Zap, ZapOff } from 'lucide-react';
import type * as monacoType from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'html' | 'css' | 'javascript';
  fileName: string;
  onSave?: () => void;
  onPreview?: () => void;
  readOnly?: boolean;
  height?: string;
  enableAutocomplete?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language,
  fileName,
  onSave,
  onPreview,
  readOnly = false,
  height = '400px',
  enableAutocomplete = true,
}: CodeEditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<monacoType.editor.IStandaloneCodeEditor | null>(null);
  const [autocompleteEnabled, setAutocompleteEnabled] = useState(enableAutocomplete);

  const handleEditorDidMount = (
    editor: monacoType.editor.IStandaloneCodeEditor,
    monaco: typeof monacoType
  ) => {
    editorRef.current = editor;

    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineHeight: 20,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      wordWrap: 'on',
      tabSize: 2,
      insertSpaces: true,
      folding: true,
      lineNumbers: 'on',
      renderWhitespace: 'boundary',
      bracketPairColorization: { enabled: true },
    });

    // Keyboard shortcut: Ctrl/Cmd + S
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    // HTML language config
    if (language === 'html') {
      monaco.languages.html.htmlDefaults.setOptions({
        format: {
          tabSize: 2,
          insertSpaces: true,
          wrapLineLength: 120,
          unformatted: 'default"',
          contentUnformatted: 'pre,code,textarea',
          indentInnerHtml: false,
          preserveNewLines: true,
          endWithNewline: false,
          extraLiners: 'head, body, /html',
          wrapAttributes: 'auto',
          maxPreserveNewLines: undefined,
          indentHandlebars: false
        },
        suggest: { html5: true },
      });
    }

    // CSS config + snippets
    if (language === 'css') {
      monaco.languages.css.cssDefaults.setOptions({
        validate: true,
        lint: {
          vendorPrefix: 'warning',
          duplicateProperties: 'warning',
          emptyRules: 'warning',
          boxModel: 'ignore',
          fontFaceProperties: 'warning',
          hexColorLength: 'error',
          argumentsInColorFunction: 'error',
          unknownProperties: 'warning',
          propertyIgnoredDueToDisplay: 'warning',
        },
      });

      monaco.languages.registerCompletionItemProvider('css', {
        provideCompletionItems: (
          model: monacoType.editor.ITextModel,
          position: monacoType.Position
        ) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          
          const suggestions: monacoType.languages.CompletionItem[] = [
            {
              label: 'flexbox-center',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'display: flex;\njustify-content: center;\nalign-items: center;',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Flexbox centering',
              range
            },
            {
              label: 'grid-center',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'display: grid;\nplace-items: center;',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Grid centering',
              range
            },
            {
              label: 'transition-all',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: 'transition: all 0.3s ease;',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Smooth transition for all properties',
              range
            },
          ];
          return { suggestions };
        },
      });
    }

    // JavaScript config + snippets
    if (language === 'javascript') {
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ES2020,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.CommonJS,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types'],
      });

      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });

      monaco.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: (
          model: monacoType.editor.ITextModel,
          position: monacoType.Position
        ) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
      
          const suggestions: monacoType.languages.CompletionItem[] = [
            {
              label: 'addEventListener',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "addEventListener('${1:event}', function(${2:e}) {\n\t${3:// code}\n});",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Add event listener',
              range,
            },
            {
              label: 'querySelector',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "document.querySelector('${1:selector}')",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Select DOM element',
              range,
            },
            {
              label: 'fetch-api',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "fetch('${1:url}')\n\t.then(response => response.json())\n\t.then(data => {\n\t\t${2:// handle data}\n\t})\n\t.catch(error => {\n\t\tconsole.error('Error:', error);\n\t});",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Fetch API request',
              range,
            },
            {
              label: 'async-function',
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: "async function ${1:functionName}() {\n\ttry {\n\t\t${2:// async code}\n\t} catch (error) {\n\t\tconsole.error(error);\n\t}\n}",
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Async function with error handling',
              range,
            },
          ];
          return { suggestions };
        },
      });
      
    }
  };

  const toggleAutocomplete = () => {
    setAutocompleteEnabled(!autocompleteEnabled);
    editorRef.current?.updateOptions({
      suggest: {
        showKeywords: !autocompleteEnabled,
        showSnippets: !autocompleteEnabled,
        showFunctions: !autocompleteEnabled,
        showConstructors: !autocompleteEnabled,
        showFields: !autocompleteEnabled,
        showVariables: !autocompleteEnabled,
        showClasses: !autocompleteEnabled,
        showStructs: !autocompleteEnabled,
        showInterfaces: !autocompleteEnabled,
        showModules: !autocompleteEnabled,
        showProperties: !autocompleteEnabled,
        showEvents: !autocompleteEnabled,
        showOperators: !autocompleteEnabled,
        showUnits: !autocompleteEnabled,
        showValues: !autocompleteEnabled,
        showConstants: !autocompleteEnabled,
        showEnums: !autocompleteEnabled,
        showEnumMembers: !autocompleteEnabled,
        showColors: !autocompleteEnabled,
        showFiles: !autocompleteEnabled,
        showReferences: !autocompleteEnabled,
        showFolders: !autocompleteEnabled,
        showTypeParameters: !autocompleteEnabled,
      },
      quickSuggestions: !autocompleteEnabled
        ? false
        : { other: true, comments: false, strings: true },
      parameterHints: { enabled: !autocompleteEnabled },
    });
  };

  const downloadFile = () => {
    const blob = new Blob([value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLanguageIcon = () => {
    switch (language) {
      case 'html':
        return '🌐';
      case 'css':
        return '🎨';
      case 'javascript':
        return '⚡';
      default:
        return '📄';
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b bg-card px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{getLanguageIcon()}</span>
          <span className="font-medium text-sm">{fileName}</span>
          <span className="text-xs text-muted-foreground uppercase">{language}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={autocompleteEnabled ? 'default' : 'ghost'}
            size="sm"
            onClick={toggleAutocomplete}
            title={autocompleteEnabled ? 'Disable Autocomplete' : 'Enable Autocomplete'}
          >
            {autocompleteEnabled ? (
              <Zap className="h-4 w-4 mr-1" />
            ) : (
              <ZapOff className="h-4 w-4 mr-1" />
            )}
            {autocompleteEnabled ? 'AC On' : 'AC Off'}
          </Button>

          {onPreview && (
            <Button variant="ghost" size="sm" onClick={onPreview}>
              <Eye className="h-4 w-4 mr-1" />
              Preview
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={downloadFile}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>

          {onSave && !readOnly && (
            <Button variant="default" size="sm" onClick={onSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="relative">
        <Editor
          height={height}
          defaultLanguage={language}
          value={value}
          onChange={(newValue) => onChange(newValue || '')}
          onMount={handleEditorDidMount}
          theme={theme === 'dark' ? 'vs-dark' : 'light'}
          options={{
            readOnly,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 20,
            wordWrap: 'on',
            tabSize: 2,
            insertSpaces: true,
            folding: true,
            lineNumbers: 'on',
            renderWhitespace: 'boundary',
            bracketPairColorization: { enabled: true },
            suggest: {
              showKeywords: autocompleteEnabled,
              showSnippets: autocompleteEnabled,
              showFunctions: autocompleteEnabled,
              showConstructors: autocompleteEnabled,
              showFields: autocompleteEnabled,
              showVariables: autocompleteEnabled,
              showClasses: autocompleteEnabled,
              showStructs: autocompleteEnabled,
              showInterfaces: autocompleteEnabled,
              showModules: autocompleteEnabled,
              showProperties: autocompleteEnabled,
              showEvents: autocompleteEnabled,
              showOperators: autocompleteEnabled,
              showUnits: autocompleteEnabled,
              showValues: autocompleteEnabled,
              showConstants: autocompleteEnabled,
              showEnums: autocompleteEnabled,
              showEnumMembers: autocompleteEnabled,
              showColors: autocompleteEnabled,
              showFiles: autocompleteEnabled,
              showReferences: autocompleteEnabled,
              showFolders: autocompleteEnabled,
              showTypeParameters: autocompleteEnabled,
            },
            quickSuggestions: autocompleteEnabled
              ? { other: true, comments: false, strings: true }
              : false,
            parameterHints: { enabled: autocompleteEnabled },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoSurround: 'languageDefined',
            formatOnPaste: true,
            formatOnType: true,
          }}
        />
      </div>
    </Card>
  );
}
