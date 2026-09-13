import { useQueryError } from '@/hooks/useQueryError';
import {
  useGetTutorConversationQuery,
  useGetTutorConversationsQuery,
  useSendTutorMessageMutation,
} from '@/api';
import { useEffect, useRef, useState } from 'react';
import {
  BookOpenCheck,
  Bot,
  MessageCircleMore,
  Plus,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageTitle } from '@/components';
import { useToast } from '@/hooks/useToast';

const EMPTY_MESSAGES = [];
const SUBJECTS = ['chinese', 'math', 'english', 'politics'];

function TutorPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [subject, setSubject] = useState('math');
  const { data: conversationList, error: listError } =
    useGetTutorConversationsQuery();
  const conversations = conversationList?.conversations || [];
  const [conversationId, setConversationId] = useState(null);
  const {
    currentData: conversationData,
    error: conversationError,
    isFetching: loadingConversation,
  } = useGetTutorConversationQuery(conversationId, { skip: !conversationId });
  const [sendMessage, { isLoading: sending }] = useSendTutorMessageMutation();
  const [draft, setDraft] = useState('');
  const [pendingMessage, setPendingMessage] = useState(null);
  const savedMessages = conversationData?.messages || EMPTY_MESSAGES;
  const messages = pendingMessage
    ? [...savedMessages, pendingMessage]
    : savedMessages;
  const endRef = useRef(null);
  useQueryError(listError || conversationError);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [savedMessages, pendingMessage, sending]);

  const newConversation = (nextSubject = subject) => {
    setConversationId(null);
    setSubject(nextSubject);
    setDraft('');
    setPendingMessage(null);
  };

  const openConversation = (conversation) => {
    setConversationId(conversation.id);
    setSubject(conversation.subject);
    setDraft('');
    setPendingMessage(null);
  };

  const send = async (event) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || sending || loadingConversation) return;
    setDraft('');
    setPendingMessage({
      id: 'pending',
      role: 'user',
      content: question,
      citations: [],
    });
    try {
      const data = await sendMessage({
        subject,
        message: question,
        conversationId,
      }).unwrap();
      setConversationId(data.conversation_id);
    } catch (err) {
      notify(err);
      setDraft(question);
    } finally {
      setPendingMessage(null);
    }
  };

  return (
    <>
      <PageTitle
        eyebrow={t('tutor.eyebrow')}
        title={t('tutor.title')}
        description={t('tutor.description')}
      />
      <div className="tutor-shell">
        <aside className="card tutor-history">
          <button
            className="primary wide"
            disabled={sending}
            onClick={() => newConversation()}
          >
            <Plus size={17} /> {t('tutor.newChat')}
          </button>
          <div className="tutor-history-label">{t('tutor.history')}</div>
          <div className="tutor-conversations">
            {conversations.map((conversation) => (
              <button
                className={conversation.id === conversationId ? 'active' : ''}
                disabled={sending}
                key={conversation.id}
                onClick={() => openConversation(conversation)}
              >
                <MessageCircleMore />
                <span>
                  <b>{conversation.title}</b>
                  <small>{t(`subjects.${conversation.subject}`)}</small>
                </span>
              </button>
            ))}
            {!conversations.length && <p>{t('tutor.noHistory')}</p>}
          </div>
        </aside>

        <section className="card tutor-chat">
          <header className="tutor-chat-head">
            <div>
              <span>
                <Sparkles />
              </span>
              <div>
                <b>{t('tutor.assistant')}</b>
                <small>{t('tutor.grounded')}</small>
              </div>
            </div>
            <div className="tutor-subjects">
              {SUBJECTS.map((item) => (
                <button
                  className={item === subject ? 'active' : ''}
                  disabled={sending}
                  key={item}
                  onClick={() => newConversation(item)}
                >
                  {t(`subjects.${item}`)}
                </button>
              ))}
            </div>
          </header>

          <div className="tutor-messages">
            {!messages.length && (
              <div className="tutor-welcome">
                <span>
                  <BookOpenCheck />
                </span>
                <h3>
                  {t('tutor.welcomeTitle', {
                    subject: t(`subjects.${subject}`),
                  })}
                </h3>
                <p>{t('tutor.welcomeDescription')}</p>
                <div>
                  {['concept', 'mistake', 'practice'].map((sample) => (
                    <button
                      key={sample}
                      onClick={() =>
                        setDraft(t(`tutor.samples.${subject}.${sample}`))
                      }
                    >
                      {t(`tutor.samples.${subject}.${sample}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((message) => (
              <article
                className={`tutor-message ${message.role}`}
                key={message.id}
              >
                <span>
                  {message.role === 'assistant' ? <Bot /> : <UserRound />}
                </span>
                <div>
                  <p>{message.content}</p>
                  {!!message.citations?.length && (
                    <div className="tutor-citations">
                      <b>{t('tutor.references')}</b>
                      {message.citations.map((citation) => (
                        <small key={`${message.id}-${citation.index}`}>
                          [{citation.index}] {citation.title}
                          {citation.source ? ` · ${citation.source}` : ''}
                        </small>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
            {sending && (
              <article className="tutor-message assistant thinking">
                <span>
                  <Bot />
                </span>
                <div>
                  <i />
                  <i />
                  <i />
                </div>
              </article>
            )}
            <div ref={endRef} />
          </div>

          <form className="tutor-composer" onSubmit={send}>
            <textarea
              rows="2"
              value={draft}
              placeholder={t('tutor.placeholder', {
                subject: t(`subjects.${subject}`),
              })}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send(event);
                }
              }}
            />
            <button
              className="primary"
              disabled={!draft.trim() || sending || loadingConversation}
            >
              <Send />
            </button>
          </form>
          <small className="tutor-disclaimer">{t('tutor.disclaimer')}</small>
        </section>
      </div>
    </>
  );
}

export default TutorPage;
