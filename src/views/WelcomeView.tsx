import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  KeyRound,
  ExternalLink,
  ArrowRight,
  Github,
  ShieldCheck,
  ChevronDown,
  BookOpen,
  ScrollText,
} from 'lucide-react'
import Button from '../components/Button'
import { useStore } from '../store/StoreContext'
import { testConnection, type TestResult } from '../api/minimax'
import type { Endpoint } from '../store/types'
import { CHAT_MODEL } from '../store/types'
import s from './WelcomeView.module.css'

const REPO_URL = 'https://github.com/klarkxy/minichat'

export default function WelcomeView() {
  const { state, dispatch } = useStore()
  const nav = useNavigate()

  const [endpoint, setEndpoint] = useState<Endpoint>(state.settings.endpoint)
  const [apiKey, setApiKey] = useState(state.settings.apiKey)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onTest = async () => {
    if (!apiKey) {
      setError('请先填入 API Key')
      return
    }
    setError(null)
    setTesting(true)
    setTest(null)
    // 测试联通用对话模型（最常见用途）
    const result = await testConnection(endpoint, apiKey, CHAT_MODEL)
    setTest(result)
    setTesting(false)
  }

  const onEnter = () => {
    if (!test?.ok) {
      setError('请先测试连接成功后再进入')
      return
    }
    dispatch({
      type: 'set-settings',
      payload: {
        ...state.settings,
        endpoint,
        apiKey,
        configured: true,
      },
    })
    nav('/')
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.head}>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className={s.repoBadge}
            title="在 GitHub 查看完整源码"
          >
            <Github size={14} />
            <span>开源 · klarkxy/minichat</span>
            <ExternalLink size={11} />
          </a>
          <div className={s.logo}>
            <span>💬</span>
          </div>
          <h1 className={s.title}>minichat</h1>
          <p className={s.subtitle}>
            基于 MiniMax 的角色扮演聊天工具 · 数据全部存在你本地浏览器
          </p>
          <div className={s.docLinks}>
            <a
              href={REPO_URL + '#readme'}
              target="_blank"
              rel="noreferrer"
              className={s.docLink}
            >
              <BookOpen size={13} />
              README
              <ExternalLink size={10} />
            </a>
            <a
              href={REPO_URL + '/blob/main/LICENSE'}
              target="_blank"
              rel="noreferrer"
              className={s.docLink}
            >
              <ScrollText size={13} />
              SATA 2.0 License
              <ExternalLink size={10} />
            </a>
          </div>
        </div>

        <div className={s.trustRow}>
          <ShieldCheck size={14} className={s.trustIcon} />
          <span>
            所有代码已开源在
            <a href={REPO_URL} target="_blank" rel="noreferrer" className={s.link}>
              GitHub
              <ExternalLink size={11} />
            </a>
            ，可随时审查。
          </span>
        </div>

        <div className={s.warning}>
          <div className={s.warnIcon}>
            <AlertTriangle size={20} />
          </div>
          <div className={s.warnBody}>
            <h2 className={s.warnTitle}>请先了解计费规则</h2>
            <p className={s.warnText}>
              这是一个调用 MiniMax 付费 API 的前端工具。调用会产生真实费用，
              开发者不清楚具体定价，请前往
              <a
                href="https://platform.minimaxi.com/docs/guides/text-chat"
                target="_blank"
                rel="noreferrer"
                className={s.link}
              >
                官方文档
                <ExternalLink size={12} />
              </a>
              和
              <a
                href="https://platform.minimaxi.com/docs/pricing/overview"
                target="_blank"
                rel="noreferrer"
                className={s.link}
              >
                定价页
                <ExternalLink size={12} />
              </a>
              自行确认余额与计费。
            </p>
            <p className={s.warnText}>
              你的 API Key 与所有数据仅保存在浏览器 localStorage 中，
              不会上传到任何后端。
            </p>
          </div>
        </div>

        <details className={s.auditDetails}>
          <summary className={s.auditSummary}>
            <ChevronDown size={14} className={s.auditChevron} />
            <span>想自己审计代码？点这里</span>
          </summary>
          <div className={s.auditBody}>
            <ol className={s.auditList}>
              <li>
                <strong>看仓库</strong>：
                <a href={REPO_URL} target="_blank" rel="noreferrer" className={s.link}>
                  {REPO_URL}
                  <ExternalLink size={11} />
                </a>
                <span className={s.auditHint}>—— 全部源码 + Actions 部署日志都可看</span>
              </li>
              <li>
                <strong>确认 API Key 不外发</strong>：在源码里搜
                <code className={s.code}>apiKey</code>
                可以看到它只出现在
                <code className={s.code}>Authorization: Bearer ...</code>
                头里，唯一请求目标是
                <code className={s.code}>api.minimax.io</code>
                或
                <code className={s.code}>api.minimaxi.com</code>
                <span className={s.auditHint}>（grep 验证，没有任何其他 fetch）</span>
              </li>
              <li>
                <strong>确认部署方式</strong>：本站由 GitHub Pages 托管，
                部署日志在
                <a
                  href={REPO_URL + '/actions'}
                  target="_blank"
                  rel="noreferrer"
                  className={s.link}
                >
                  Actions 页面
                  <ExternalLink size={11} />
                </a>
                <span className={s.auditHint}>（build 流程完全透明）</span>
              </li>
              <li>
                <strong>确认无后端</strong>：本站是纯静态页面，所有状态都在你浏览器的
                <code className={s.code}>localStorage</code>
                里。换电脑 = 全新状态，没有任何云端同步。
              </li>
            </ol>
          </div>
        </details>

        <div className={s.modelNote}>
          <div className={s.modelNoteTitle}>默认模型</div>
          <ul className={s.modelList}>
            <li>
              <span className={s.modelTag}>对话</span>
              <code className={s.modelName}>M2-her</code>
              <span className={s.modelDesc}>—— 角色扮演和聊天</span>
            </li>
            <li>
              <span className={[s.modelTag, s.modelTagGen].join(' ')}>生成</span>
              <code className={s.modelName}>MiniMax-M3</code>
              <span className={s.modelDesc}>—— AI 写人设、生成示例对话</span>
            </li>
          </ul>
          <p className={s.modelHint}>
            不用选，开箱即用。如果需要可在右上角齿轮里修改。
          </p>
        </div>

        <div className={s.form}>
          <div className={s.section}>
            <h3 className={s.sectionTitle}>1. 选择 Endpoint</h3>
            <div className={s.segment}>
              <button
                type="button"
                className={[s.seg, endpoint === 'global' ? s.segActive : ''].join(' ')}
                onClick={() => {
                  setEndpoint('global')
                  setTest(null)
                }}
              >
                国际版
                <span className={s.segHint}>minimax.io</span>
              </button>
              <button
                type="button"
                className={[s.seg, endpoint === 'cn' ? s.segActive : ''].join(' ')}
                onClick={() => {
                  setEndpoint('cn')
                  setTest(null)
                }}
              >
                国内版
                <span className={s.segHint}>minimaxi.com</span>
              </button>
            </div>
          </div>

          <div className={s.section}>
            <h3 className={s.sectionTitle}>2. 填入 API Key</h3>
            <div className={s.keyWrap}>
              <KeyRound size={16} className={s.keyIcon} />
              <input
                type={showKey ? 'text' : 'password'}
                className={s.keyInput}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setTest(null)
                }}
                placeholder="eyJhbGciOi..."
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className={s.eye}
                onClick={() => setShowKey((v) => !v)}
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </div>
            <p className={s.hint}>
              可在
              <a
                href={
                  endpoint === 'global'
                    ? 'https://platform.minimax.io/user-center/basic-information/interface-key'
                    : 'https://platform.minimaxi.com/user-center/basic-information/interface-key'
                }
                target="_blank"
                rel="noreferrer"
                className={s.link}
              >
                开放平台
                <ExternalLink size={12} />
              </a>
              创建。
            </p>
          </div>

          <div className={s.section}>
            <h3 className={s.sectionTitle}>3. 测试联通</h3>
            <div className={s.testRow}>
              <Button
                variant="secondary"
                onClick={onTest}
                loading={testing}
                disabled={!apiKey}
              >
                发送一次测试请求
              </Button>
              {test ? (
                <div
                  className={[s.test, test.ok ? s.testOk : s.testFail].join(' ')}
                >
                  {test.ok ? '✅ ' : '❌ '}
                  {test.message}
                  {test.latencyMs != null ? ` · ${test.latencyMs}ms` : ''}
                  {test.reply ? ` · "${test.reply}"` : ''}
                </div>
              ) : null}
            </div>
            {error ? <p className={s.error}>{error}</p> : null}
          </div>

          <div className={s.actions}>
            <Button
              variant="primary"
              size="lg"
              block
              onClick={onEnter}
              disabled={!test?.ok}
              iconRight={<ArrowRight size={16} />}
            >
              {test?.ok ? '进入 minichat' : '请先完成联通测试'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
