'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Editor,
  EditorState,
  RichUtils,
  convertToRaw,
  convertFromRaw,
  AtomicBlockUtils,
  ContentBlock,
  ContentState,
  Modifier,
} from 'draft-js';
import 'draft-js/dist/Draft.css';

interface DraftEditorProps {
  initialContent?: string;
  onChange: (rawContent: string) => void;
}

const INLINE_STYLES = [
  { label: 'B', style: 'BOLD', title: '굵게' },
  { label: 'I', style: 'ITALIC', title: '기울임' },
  { label: 'U', style: 'UNDERLINE', title: '밑줄' },
];

const BLOCK_TYPES = [
  { label: 'H1', style: 'header-one', title: '제목 1' },
  { label: 'H2', style: 'header-two', title: '제목 2' },
  { label: 'H3', style: 'header-three', title: '제목 3' },
  { label: '•', style: 'unordered-list-item', title: '목록' },
  { label: '1.', style: 'ordered-list-item', title: '번호 목록' },
  { label: '❝', style: 'blockquote', title: '인용' },
];

const COLOR_PRESETS = [
  { color: '#111111', label: '검정' },
  { color: '#EF4444', label: '빨강' },
  { color: '#F97316', label: '주황' },
  { color: '#EAB308', label: '노랑' },
  { color: '#22C55E', label: '초록' },
  { color: '#3B82F6', label: '파랑' },
  { color: '#8B5CF6', label: '보라' },
  { color: '#EC4899', label: '분홍' },
  { color: '#6B7280', label: '회색' },
];

const COLOR_STYLE_MAP: Record<string, React.CSSProperties> = {};
COLOR_PRESETS.forEach(({ color }) => {
  COLOR_STYLE_MAP[`COLOR_${color.replace('#', '')}`] = { color };
});

function compressEditorImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const maxWidth = 800;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ImageBlock({
  block,
  contentState,
}: {
  block: ContentBlock;
  contentState: ContentState;
}) {
  const entityKey = block.getEntityAt(0);
  if (!entityKey) return null;
  const { src } = contentState.getEntity(entityKey).getData() as { src: string };
  return (
    <div className="my-2 text-center">
      <img src={src} alt="삽입 이미지" className="max-w-full rounded-lg inline-block" />
    </div>
  );
}

function blockRendererFn(block: ContentBlock) {
  if (block.getType() === 'atomic') {
    return { component: ImageBlock, editable: false };
  }
  return null;
}

function StyleButton({
  active,
  label,
  title,
  onToggle,
  style,
}: {
  active: boolean;
  label: string;
  title: string;
  onToggle: (style: string) => void;
  style: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onToggle(style); }}
      title={title}
      className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
        active
          ? 'bg-accent-500 text-white'
          : 'bg-white text-steel-600 hover:bg-steel-100 border border-steel-200'
      }`}
    >
      {label}
    </button>
  );
}

export default function DraftEditor({ initialContent, onChange }: DraftEditorProps) {
  const [editorState, setEditorState] = useState(() => {
    if (initialContent) {
      try {
        const raw = JSON.parse(initialContent);
        return EditorState.createWithContent(convertFromRaw(raw));
      } catch {
        return EditorState.createEmpty();
      }
    }
    return EditorState.createEmpty();
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const editorRef = useRef<Editor>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (state: EditorState) => {
      setEditorState(state);
      const raw = convertToRaw(state.getCurrentContent());
      onChange(JSON.stringify(raw));
    },
    [onChange]
  );

  const toggleInlineStyle = (style: string) => {
    handleChange(RichUtils.toggleInlineStyle(editorState, style));
  };

  const toggleBlockType = (blockType: string) => {
    handleChange(RichUtils.toggleBlockType(editorState, blockType));
  };

  const applyColor = useCallback(
    (color: string) => {
      const colorStyle = `COLOR_${color.replace('#', '')}`;
      const selection = editorState.getSelection();
      let newState = editorState;

      if (selection.isCollapsed()) {
        COLOR_PRESETS.forEach(({ color: c }) => {
          const s = `COLOR_${c.replace('#', '')}`;
          if (newState.getCurrentInlineStyle().has(s)) {
            newState = RichUtils.toggleInlineStyle(newState, s);
          }
        });
        if (!newState.getCurrentInlineStyle().has(colorStyle)) {
          newState = RichUtils.toggleInlineStyle(newState, colorStyle);
        }
      } else {
        let contentState = newState.getCurrentContent();
        COLOR_PRESETS.forEach(({ color: c }) => {
          contentState = Modifier.removeInlineStyle(contentState, selection, `COLOR_${c.replace('#', '')}`);
        });
        contentState = Modifier.applyInlineStyle(contentState, selection, colorStyle);
        newState = EditorState.push(newState, contentState, 'change-inline-style');
        newState = EditorState.forceSelection(newState, selection);
      }

      handleChange(newState);
      setShowColorPicker(false);
    },
    [editorState, handleChange]
  );

  const insertImage = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      try {
        const src = await compressEditorImage(file);
        const contentState = editorState.getCurrentContent();
        const contentWithEntity = contentState.createEntity('IMAGE', 'IMMUTABLE', { src });
        const entityKey = contentWithEntity.getLastCreatedEntityKey();
        const stateWithEntity = EditorState.set(editorState, { currentContent: contentWithEntity });
        handleChange(AtomicBlockUtils.insertAtomicBlock(stateWithEntity, entityKey, ' '));
      } catch {
        // ignore
      }
    },
    [editorState, handleChange]
  );

  const currentStyle = editorState.getCurrentInlineStyle();
  const selection = editorState.getSelection();
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType();

  const activeColor =
    COLOR_PRESETS.find(({ color }) => currentStyle.has(`COLOR_${color.replace('#', '')}`))?.color ??
    '#111111';

  const blockStyleFn = (block: ContentBlock) => {
    switch (block.getType()) {
      case 'blockquote':
        return 'border-l-4 border-accent-500 pl-4 my-2 text-steel-500 italic';
      case 'header-one':
        return 'text-2xl font-bold my-2';
      case 'header-two':
        return 'text-xl font-bold my-2';
      case 'header-three':
        return 'text-lg font-semibold my-2';
      default:
        return '';
    }
  };

  return (
    <div className="border border-steel-200 rounded-xl overflow-hidden">
      {/* 툴바 */}
      <div className="bg-steel-50 border-b border-steel-200 p-3 flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {INLINE_STYLES.map((type) => (
            <StyleButton
              key={type.style}
              active={currentStyle.has(type.style)}
              label={type.label}
              title={type.title}
              onToggle={toggleInlineStyle}
              style={type.style}
            />
          ))}
        </div>

        <div className="w-px bg-steel-200 self-stretch" />

        {/* 글자 색상 */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setShowColorPicker((v) => !v);
            }}
            title="글자 색상"
            className="flex flex-col items-center justify-center px-2.5 py-1 rounded border border-steel-200 bg-white hover:bg-steel-100 transition-colors gap-0.5"
          >
            <span className="text-sm font-bold leading-none text-steel-700">A</span>
            <span
              className="block h-1 w-5 rounded-full"
              style={{ backgroundColor: activeColor }}
            />
          </button>

          {showColorPicker && (
            <>
              <div
                className="fixed inset-0 z-[9]"
                onClick={() => setShowColorPicker(false)}
              />
              <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-steel-200 rounded-xl shadow-lg p-2.5 grid grid-cols-5 gap-1.5 w-36">
                {COLOR_PRESETS.map(({ color, label }) => (
                  <button
                    key={color}
                    type="button"
                    title={label}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyColor(color);
                    }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                      activeColor === color
                        ? 'border-steel-700 scale-110'
                        : 'border-white shadow-sm'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="w-px bg-steel-200 self-stretch" />

        <div className="flex gap-1 flex-wrap">
          {BLOCK_TYPES.map((type) => (
            <StyleButton
              key={type.style}
              active={blockType === type.style}
              label={type.label}
              title={type.title}
              onToggle={toggleBlockType}
              style={type.style}
            />
          ))}
        </div>

        <div className="w-px bg-steel-200 self-stretch" />

        {/* 이미지 삽입 */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            imageInputRef.current?.click();
          }}
          title="이미지 삽입"
          className="px-2.5 py-1.5 text-base rounded border border-steel-200 bg-white hover:bg-steel-100 transition-colors"
        >
          🖼️
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) insertImage(file);
            e.target.value = '';
          }}
        />
      </div>

      {/* 에디터 영역 */}
      <div
        className="min-h-96 bg-white p-4 cursor-text"
        onClick={() => editorRef.current?.focus()}
      >
        <Editor
          ref={editorRef}
          editorState={editorState}
          onChange={handleChange}
          blockStyleFn={blockStyleFn}
          blockRendererFn={blockRendererFn}
          customStyleMap={COLOR_STYLE_MAP}
          placeholder="내용을 입력하세요..."
        />
      </div>
    </div>
  );
}

// ── 공개 페이지용 HTML 렌더러 ─────────────────────────────────────────────────

type RawBlock = {
  text: string;
  type: string;
  inlineStyleRanges: Array<{ offset: number; length: number; style: string }>;
  entityRanges: Array<{ offset: number; length: number; key: number }>;
};

type RawEntityMap = Record<string, { type: string; data: Record<string, string> }>;

function renderBlockToHtml(block: RawBlock, entityMap: RawEntityMap): string {
  const { text, type, inlineStyleRanges, entityRanges } = block;

  if (type === 'atomic') {
    const entityRange = entityRanges[0];
    if (entityRange !== undefined) {
      const entity = entityMap[entityRange.key];
      if (entity?.type === 'IMAGE') {
        return `<figure style="margin:12px 0;text-align:center;"><img src="${entity.data.src}" style="max-width:100%;border-radius:8px;" /></figure>`;
      }
    }
    return '';
  }

  if (!text) return type === 'unstyled' ? '<p><br /></p>' : '';

  const charStyles: string[][] = Array.from({ length: text.length }, () => []);
  inlineStyleRanges.forEach(({ offset, length, style }) => {
    for (let i = offset; i < Math.min(offset + length, text.length); i++) {
      charStyles[i].push(style);
    }
  });

  const segments: Array<{ text: string; styles: string[] }> = [];
  let i = 0;
  while (i < text.length) {
    const styles = charStyles[i];
    let j = i + 1;
    while (j < text.length && charStyles[j].join('|') === styles.join('|')) j++;
    segments.push({ text: text.slice(i, j), styles });
    i = j;
  }

  const innerHtml = segments
    .map(({ text: t, styles }) => {
      let content = t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      const cssStyles: string[] = [];
      styles.forEach((style) => {
        if (style === 'BOLD') content = `<strong>${content}</strong>`;
        else if (style === 'ITALIC') content = `<em>${content}</em>`;
        else if (style === 'UNDERLINE') cssStyles.push('text-decoration:underline');
        else if (style === 'STRIKETHROUGH') cssStyles.push('text-decoration:line-through');
        else if (style.startsWith('COLOR_'))
          cssStyles.push(`color:#${style.replace('COLOR_', '')}`);
      });

      if (cssStyles.length > 0) {
        content = `<span style="${cssStyles.join(';')}">${content}</span>`;
      }
      return content;
    })
    .join('');

  switch (type) {
    case 'header-one':   return `<h1>${innerHtml}</h1>`;
    case 'header-two':   return `<h2>${innerHtml}</h2>`;
    case 'header-three': return `<h3>${innerHtml}</h3>`;
    case 'blockquote':
      return `<blockquote style="border-left:4px solid #f97316;padding-left:1rem;color:#6b7280;font-style:italic;margin:8px 0;">${innerHtml}</blockquote>`;
    case 'unordered-list-item': return `<li>${innerHtml}</li>`;
    case 'ordered-list-item':   return `<li>${innerHtml}</li>`;
    default: return `<p>${innerHtml}</p>`;
  }
}

export function renderDraftContent(rawContent: string): string {
  try {
    const raw = JSON.parse(rawContent) as { blocks: RawBlock[]; entityMap: RawEntityMap };
    const { blocks, entityMap } = raw;
    let html = '';
    let inUl = false;
    let inOl = false;

    blocks.forEach((block) => {
      const isUl = block.type === 'unordered-list-item';
      const isOl = block.type === 'ordered-list-item';

      if (inUl && !isUl) { html += '</ul>'; inUl = false; }
      if (inOl && !isOl) { html += '</ol>'; inOl = false; }
      if (!inUl && isUl) { html += '<ul style="list-style:disc;padding-left:1.5rem;">'; inUl = true; }
      if (!inOl && isOl) { html += '<ol style="list-style:decimal;padding-left:1.5rem;">'; inOl = true; }

      html += renderBlockToHtml(block, entityMap);
    });

    if (inUl) html += '</ul>';
    if (inOl) html += '</ol>';
    return html;
  } catch {
    return '';
  }
}
