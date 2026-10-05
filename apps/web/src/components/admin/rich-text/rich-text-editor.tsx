'use client';

import {
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { cx, focusRing } from '@/lib/admin/cx';
import { FieldContext } from '../ui/field';
import { MediaPicker } from '../media/media-picker';
import {
  ImageDialog,
  LinkDialog,
  choiceFromMedia,
  type ImageChoice,
} from './rich-text-dialogs';

/** Images admises dans le texte : celles de la médiathèque, comme côté API. */
const UPLOAD_IMG = /<img\b[^>]*\bsrc=["']\/uploads\/[A-Za-z0-9._-]+["'][^>]*>/i;

/**
 * Éditeur de texte enrichi des actualités (Tiptap). Volontairement réduit à
 * ce que le site public sait afficher : sous-titres, gras, italique, listes,
 * citation, liens et images de la médiathèque — ni couleurs, ni polices, ni
 * tailles (la charte vient du site, pas de l'auteur). Ce que l'éditeur
 * produit n'est qu'une proposition : l'API nettoie le HTML à l'enregistrement
 * (`apps/api/src/common/utils/rich-text.ts`) ; toute évolution des balises
 * admises se fait des deux côtés.
 *
 * Non contrôlé après le montage : `value` n'est lue qu'au départ, comme un
 * `defaultValue` (le formulaire ne réinitialise jamais le texte de l'extérieur).
 */
export function RichTextEditor({
  value,
  onChange,
  onBlur,
  label,
}: {
  value: string;
  /** HTML du texte ; chaîne vide si l'éditeur ne contient plus rien. */
  onChange: (html: string) => void;
  onBlur?: () => void;
  /** Nom accessible de la zone de saisie (ex. « Contenu (français) »). */
  label: string;
}) {
  const field = useContext(FieldContext);
  const [linkOpen, setLinkOpen] = useState(false);
  // Adresse du lien sous le curseur, relevée à l'ouverture (l'éditeur ne fait pas re-rendre le composant à chaque frappe).
  const [linkHref, setLinkHref] = useState('');
  const [picking, setPicking] = useState(false);
  const [imageChoice, setImageChoice] = useState<ImageChoice | null>(null);
  const [editingImage, setEditingImage] = useState(false);

  // Le dernier rappel, sans relancer l'éditeur à chaque rendu du formulaire.
  const callbacks = useRef({ onChange, onBlur });
  useEffect(() => {
    callbacks.current = { onChange, onBlur };
  });

  const editorAttributes = {
    ...(field?.id && { id: field.id }),
    role: 'textbox',
    'aria-multiline': 'true',
    'aria-label': label,
    ...(field?.describedBy && { 'aria-describedby': field.describedBy }),
    ...(field?.invalid && { 'aria-invalid': 'true' }),
    class:
      'article-prose min-h-[22rem] px-4 py-3.5 text-base text-ink outline-none [--prose-link:var(--color-brand-strong)] [--prose-muted:var(--color-ink-muted)]',
  };

  const editor = useEditor({
    // Le portail est rendu côté navigateur : pas de contenu à hydrater.
    immediatelyRender: false,
    content: value,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: false,
          defaultProtocol: 'https',
          protocols: ['mailto', 'tel'],
        },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
      }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    editorProps: {
      attributes: editorAttributes,
      // Un collage d'une page web ou de Word peut apporter des images
      // externes : elles seraient retirées à l'enregistrement, autant ne
      // pas les laisser apparaître.
      transformPastedHTML: (html) =>
        html.replace(/<img\b[^>]*>/gi, (tag) =>
          UPLOAD_IMG.test(tag) ? tag : '',
        ),
    },
    onUpdate: ({ editor: current }) =>
      callbacks.current.onChange(current.isEmpty ? '' : current.getHTML()),
    onBlur: () => callbacks.current.onBlur?.(),
  });

  // Les attributs d'accessibilité suivent l'état du champ (erreur, aide).
  const attributesKey = JSON.stringify(editorAttributes);
  useEffect(() => {
    editor?.setOptions({
      editorProps: {
        ...editor.options.editorProps,
        attributes: JSON.parse(attributesKey) as Record<string, string>,
      },
    });
  }, [editor, attributesKey]);

  const imageSelected = useEditorState({
    editor,
    selector: ({ editor: current }) => current?.isActive('image') ?? false,
  });

  function insertImage(alt: string) {
    if (!editor || !imageChoice) return;
    const chain = editor.chain().focus();
    if (editingImage) chain.updateAttributes('image', { alt }).run();
    else chain.setImage({ src: imageChoice.src, alt }).run();
    setImageChoice(null);
    setEditingImage(false);
  }

  function editImageAlt() {
    if (!editor) return;
    const { src, alt } = editor.getAttributes('image') as {
      src?: string;
      alt?: string;
    };
    if (!src) return;
    setEditingImage(true);
    setImageChoice({
      src,
      preview: `${src}?size=thumb`,
      name: src,
      alt: alt ?? '',
    });
  }

  function openLink() {
    setLinkHref((editor?.getAttributes('link').href as string) ?? '');
    setLinkOpen(true);
  }

  return (
    <div
      className={cx(
        'overflow-hidden rounded-lg border bg-panel transition-[border-color,box-shadow]',
        'focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15',
        field?.invalid ? 'border-bad' : 'border-line-strong',
      )}
    >
      {editor && (
        <Toolbar
          editor={editor}
          imageSelected={Boolean(imageSelected)}
          onLink={openLink}
          onPickImage={() => setPicking(true)}
          onEditImage={editImageAlt}
        />
      )}
      <div className="portal-scroll max-h-[70dvh] overflow-y-auto border-t border-line">
        <EditorContent editor={editor} />
      </div>

      <LinkDialog
        open={linkOpen}
        initialHref={linkHref}
        onClose={() => setLinkOpen(false)}
        onSave={(href) => {
          editor
            ?.chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href })
            .run();
          setLinkOpen(false);
        }}
        onRemove={
          linkHref
            ? () => {
                editor
                  ?.chain()
                  .focus()
                  .extendMarkRange('link')
                  .unsetLink()
                  .run();
                setLinkOpen(false);
              }
            : undefined
        }
      />

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onConfirm={([media]) => {
          setEditingImage(false);
          setImageChoice(choiceFromMedia(media));
        }}
        title="Insérer une image"
        confirmLabel="Utiliser cette image"
      />
      <ImageDialog
        choice={imageChoice}
        editing={editingImage}
        onClose={() => {
          setImageChoice(null);
          setEditingImage(false);
        }}
        onSave={insertImage}
      />
    </div>
  );
}

interface ToolbarItem {
  key: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  /** Bouton à bascule : son état est annoncé (`aria-pressed`). */
  toggle?: boolean;
  disabled?: boolean;
  run: () => void;
  /** Séparateur avant ce bouton. */
  group?: boolean;
}

function Toolbar({
  editor,
  imageSelected,
  onLink,
  onPickImage,
  onEditImage,
}: {
  editor: Editor;
  imageSelected: boolean;
  onLink: () => void;
  onPickImage: () => void;
  onEditImage: () => void;
}) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h2: e.isActive('heading', { level: 2 }),
      h3: e.isActive('heading', { level: 3 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      link: e.isActive('link'),
      hasSelection: !e.state.selection.empty,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  const items: ToolbarItem[] = [
    {
      key: 'h2',
      toggle: true,
      label: 'Titre de section',
      icon: Heading2,
      active: state.h2,
      run: () => chain().toggleHeading({ level: 2 }).run(),
    },
    {
      key: 'h3',
      toggle: true,
      label: 'Sous-titre',
      icon: Heading3,
      active: state.h3,
      run: () => chain().toggleHeading({ level: 3 }).run(),
    },
    {
      key: 'bold',
      toggle: true,
      label: 'Gras',
      icon: Bold,
      active: state.bold,
      group: true,
      run: () => chain().toggleBold().run(),
    },
    {
      key: 'italic',
      toggle: true,
      label: 'Italique',
      icon: Italic,
      active: state.italic,
      run: () => chain().toggleItalic().run(),
    },
    {
      key: 'bullet',
      toggle: true,
      label: 'Liste à puces',
      icon: List,
      active: state.bullet,
      group: true,
      run: () => chain().toggleBulletList().run(),
    },
    {
      key: 'ordered',
      toggle: true,
      label: 'Liste numérotée',
      icon: ListOrdered,
      active: state.ordered,
      run: () => chain().toggleOrderedList().run(),
    },
    {
      key: 'quote',
      toggle: true,
      label: 'Citation',
      icon: Quote,
      active: state.quote,
      run: () => chain().toggleBlockquote().run(),
    },
    {
      key: 'link',
      toggle: true,
      label: state.link
        ? 'Modifier le lien'
        : state.hasSelection
          ? 'Ajouter un lien'
          : 'Ajouter un lien (sélectionnez d’abord le texte)',
      icon: Link2,
      active: state.link,
      disabled: !state.link && !state.hasSelection,
      group: true,
      run: onLink,
    },
    {
      key: 'image',
      label: imageSelected
        ? 'Modifier la description de l’image'
        : 'Insérer une image',
      icon: ImagePlus,
      active: imageSelected,
      run: imageSelected ? onEditImage : onPickImage,
    },
    {
      key: 'undo',
      label: 'Annuler',
      icon: Undo2,
      disabled: !state.canUndo,
      group: true,
      run: () => chain().undo().run(),
    },
    {
      key: 'redo',
      label: 'Rétablir',
      icon: Redo2,
      disabled: !state.canRedo,
      run: () => chain().redo().run(),
    },
  ];

  // Barre d'outils à un seul arrêt de tabulation : flèches, début et fin
  // parcourent les boutons (motif ARIA « toolbar »).
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const [current, setCurrent] = useState(0);
  function move(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = items
      .map((item, index) => (item.disabled ? -1 : index))
      .filter((index) => index >= 0);
    const at = enabled.indexOf(current);
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = enabled[(at + 1) % enabled.length];
    else if (event.key === 'ArrowLeft')
      next = enabled[(at - 1 + enabled.length) % enabled.length];
    else if (event.key === 'Home') next = enabled[0];
    else if (event.key === 'End') next = enabled[enabled.length - 1];
    if (next === undefined) return;
    event.preventDefault();
    setCurrent(next);
    buttons.current[next]?.focus();
  }

  return (
    <div
      role="toolbar"
      aria-label="Mise en forme du texte"
      onKeyDown={move}
      className="flex flex-wrap items-center gap-0.5 bg-sunken/60 px-2 py-1.5"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <span key={item.key} className="flex items-center">
            {item.group && index > 0 && (
              <span
                aria-hidden="true"
                className="mx-1.5 h-5 w-px bg-line-strong"
              />
            )}
            <button
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              title={item.label}
              aria-label={item.label}
              aria-pressed={item.toggle ? Boolean(item.active) : undefined}
              aria-disabled={item.disabled || undefined}
              tabIndex={index === current ? 0 : -1}
              // Garder la sélection du texte : le bouton ne doit pas prendre le focus à la souris.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                if (item.disabled) return;
                setCurrent(index);
                item.run();
              }}
              className={cx(
                'grid size-8 place-items-center rounded-md text-ink-muted transition-colors',
                focusRing,
                item.active
                  ? 'bg-brand-soft text-brand-strong'
                  : 'hover:bg-ink/5 hover:text-ink',
                item.disabled &&
                  'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-ink-muted',
              )}
            >
              <Icon size={17} aria-hidden="true" />
            </button>
          </span>
        );
      })}
    </div>
  );
}
