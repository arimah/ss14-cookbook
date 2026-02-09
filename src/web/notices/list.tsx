import {
  Fragment,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { ErrorIcon, InformationIcon, StarOnIcon, WarningIcon } from '../icons';
import { RecipePopup } from '../recipe-popup';
import { FirstVisitKey, useStorage } from '../storage';
import { NoticeData, NoticeIcon } from '../types';
import { NoticesContext } from './context';
import { Notice } from './notice';

export interface NoticeListProps {
  currentFork: string;
}

const Icons: Record<NoticeIcon, ReactElement> = {
  info: <InformationIcon/>,
  warn: <WarningIcon/>,
  error: <ErrorIcon/>,
  star: <StarOnIcon/>,
};

export const NoticeList = ({ currentFork }: NoticeListProps): ReactElement => {
  // We need the context here so we can skip rendering dismissed notices
  // altogether. Otherwise the `<Notice>` would take care of that.
  const context = useContext(NoticesContext);

  const storage = useStorage<string>(FirstVisitKey);
  const firstVisit = useMemo(() => storage.read(today), []);
  useEffect(() => {
    if (!storage.has()) {
      storage.write(today());
    }
  }, []);

  const shouldShowNotice = useMemo(() => {
    return (notice: NoticeData): boolean => {
      if (context.isDismissed(notice.id)) {
        return false;
      }
      if (notice.forks != null && !notice.forks.includes(currentFork)) {
        return false;
      }
      if (
        notice.ifFirstVisitedBefore &&
        firstVisit > notice.ifFirstVisitedBefore
      ) {
        return false;
      }
      return true;
    };
  }, [context, firstVisit, currentFork]);

  return <>
    {context.all.map(notice =>
      shouldShowNotice(notice) ? (
        <Notice
          key={notice.id}
          id={notice.id}
          icon={notice.icon && Icons[notice.icon]}
          kind={notice.kind}
        >
          <h3>{notice.title}</h3>
          {notice.content.map((source, i) =>
            <p key={i}>{parseContent(source)}</p>
          )}
        </Notice>
      ) : null
    )}
  </>;
};

const parseContent = (source: string): ReactNode[] => {
  let content: ReactNode[] = [];
  let tag = '';
  let stack: [string, string, ReactNode[]][] = [];

  const emitText = (text: string) => {
    const last = content[content.length - 1];
    if (typeof last === 'string') {
      content[content.length - 1] = `${last}${text}`;
    } else {
      content.push(text);
    }
  };

  const close = () => {
    const [attr, prevTag, prevContent] = stack.pop()!;
    const key = prevContent.length;
    switch (tag) {
      case 'recipe':
        prevContent.push(
          <RecipePopup key={key} id={attr}>
            <span className='more-info'>
              {content}
            </span>
          </RecipePopup>
        );
        break;
      case 'link':
        prevContent.push(
          <a key={key} href={attr} target='_blank' rel='noopener'>
            {content}
          </a>
        );
        break;
      default:
        console.error(`Unknown formatting tag: '[${tag}]'`);
        prevContent.push(<Fragment key={key}>{content}</Fragment>);
        break;
    }
    content = prevContent;
    tag = prevTag;
  };

  const tagRegex = /\[([a-z]+)=([^\]]+)\]|\[\/([a-z]+)\]|(\[|[^[]+)/g;
  let m: RegExpExecArray | null;
  while ((m = tagRegex.exec(source)) != null) {
    const [, startTag, attr, closeTag, text] = m;
    if (startTag) {
      stack.push([attr, tag, content]);
      tag = startTag;
      content = [];
    } else if (closeTag) {
      if (closeTag !== tag) {
        console.error(`Tried to close '[${tag}]' with '[/${closeTag}]'`);
      } else {
        close();
      }
    } else {
      emitText(text);
    }
  }

  while (tag) {
    console.error(`Unclosed tag: [${tag}]`);
    close();
  }

  return content;
};

const formatDate = (date: Date): string => {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

const today = (): string => formatDate(new Date());
