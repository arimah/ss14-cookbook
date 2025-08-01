import {
  MouseEvent,
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {createPortal} from 'react-dom';
import {useBlocker} from 'react-router-dom';

import {MetaData, SpriteAttribution} from '../types';

import {getPopupRoot} from './popup-impl';
import {RawSprite} from './sprites';
import {CloseIcon} from './icons';
import {Tooltip} from './tooltip';
import {Overlay} from './overlay';
import {FocusTrap} from './focus';
import {GitHubFolderUrl} from './helpers';

// TODO: Move this somewhere else probably
const TexturesSubPath = 'Resources/Textures';

export interface Props {
  value: readonly SpriteAttribution[];
  meta: MetaData,
}

export const AttributionsLink = memo((props: Props): JSX.Element => {
  const {value, meta} = props;

  const [open, setOpen] = useState(false);

  const handleClick = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  return <>
    <a href='#' onClick={handleClick}>
      Show sprite credits and licenses
    </a>
    {open && createPortal(
      <AttributionsDialog value={value} meta={meta} onClose={close}/>,
      getPopupRoot()
    )}
  </>;
});

interface AttributionsDialogProps {
  value: readonly SpriteAttribution[];
  meta: MetaData,
  onClose: () => void;
}

const AttributionsDialog = memo((
  props: AttributionsDialogProps
): JSX.Element => {
  const {value, meta, onClose} = props;

  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);

  // Always prevent navigation while this is open
  useBlocker(true);

  return (
    <Overlay>
      <FocusTrap onPointerDownOutside={onClose}>
        <section className='dialog attributions' ref={ref} tabIndex={-1}>
          <h2>Sprite credits</h2>

          <p><i>Clickable links in the</i> Copyright <i>field are a best-faith interpretation and not guaranteed to be correct.</i></p>

          <ul className='attributions_list thin-scroll'>
            {value.map(attr =>
              <AttributionItem key={attr.path} attr={attr} meta={meta}/>
            )}
          </ul>

          <Tooltip text='Close' provideLabel>
            <button className='dialog_close' onClick={onClose}>
              <CloseIcon/>
            </button>
          </Tooltip>
        </section>
      </FocusTrap>
    </Overlay>
  );
});

interface AttributionItemProps {
  attr: SpriteAttribution;
  meta: MetaData;
}

const AttributionItem = (props: AttributionItemProps) => {
  const {attr, meta} = props;

  const pathUrl = GitHubFolderUrl(
    meta.repo,
    meta.commit,
    `${TexturesSubPath}/${attr.path}`
  );

  return (
    <li className='attributions_item'>
      <div className='attributions_sprites'>
        {attr.sprites.map((pos, i) =>
          <RawSprite key={i} position={pos} alt=''/>
        )}
      </div>
      <p>
        <b>Path:</b>
        {' '}
        <a href={pathUrl} target='_blank' rel='noopener'>{attr.path}</a>
      </p>
      <p><b>License:</b> <LicenseText license={attr.license}/></p>
      <p><b>Copyright:</b> <CopyrightText copyright={attr.copyright}/></p>
    </li>
  );
};

const PublicDomainUrl = 'https://creativecommons.org/publicdomain/zero/1.0/';
const CreativeCommonsUrl = (kind: string, version: string) =>
  `https://creativecommons.org/licenses/${kind.toLowerCase()}/${version}/`;

const PublicDomainRegex = /^CC[- ]?0(-1\.0)?$/;
const CreativeCommonsRegex = /^CC[- ](BY(?:-SA|-NC|-ND)*)-([0-9]+\.[0-9]+)$/;

interface LicenceTextProps {
  license: string;
}

const LicenseText = (props: LicenceTextProps): JSX.Element => {
  const {license} = props;

  let url: string | null = null;
  const m = license.match(CreativeCommonsRegex);
  if (m) {
    url = CreativeCommonsUrl(m[1], m[2]);
  } else if (PublicDomainRegex.test(license)) {
    url = PublicDomainUrl;
  }

  return (
    url ? (
      <a href={url} target='_blank' rel='noopener'>
        {license}
      </a>
    ) : <>{license}</>
  );
};

const TrailingPunctuationRegex = /[.,]+$/;

interface CopyrightTextProps {
  copyright: string;
}

const CopyrightText = memo((props: CopyrightTextProps): ReactNode => {
  const {copyright} = props;

  // This regex is intentionally quite limited, to URLs of the following forms:
  //    https?://github.com/USER/REPO
  //    https?://github.com/USER/REPO/commit/HASH
  //    https?://github.com/USER/REPO/blob/HASH/PATH
  // If the PATH at the end of a blob URL ends with `.` or `,`, we ignore it.
  const githubUrlRegex = /https?:\/\/github\.com\/[^ /]+\/[^ /]+(?:\/commit\/[a-fA-F0-9]+\/?|\/blob\/[a-fA-F0-9]+(?:\/[^ /]+)+)?/g;

  const parts: ReactNode[] = [];
  let lastPartEnd = 0;

  let m: RegExpExecArray | null;
  while ((m = githubUrlRegex.exec(copyright))) {
    // If there's any text between where this URL starts and where
    // the previous part ended, insert that text.
    if (lastPartEnd < m.index) {
      parts.push(copyright.slice(lastPartEnd, m.index));
    }

    let url = m[0];
    const trailingPunct = TrailingPunctuationRegex.exec(url);
    if (trailingPunct) {
      url = url.slice(0, url.length - trailingPunct[0].length);
    }

    parts.push(
      <a key={m.index} href={url} target='_blank' rel='noopener'>
        {url}
      </a>
    );

    lastPartEnd = m.index + url.length;
  }
  if (lastPartEnd < copyright.length) {
    parts.push(copyright.slice(lastPartEnd));
  }

  return parts;
});
