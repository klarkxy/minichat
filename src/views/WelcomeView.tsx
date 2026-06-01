import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, KeyRound, ExternalLink, ArrowRight } from 'lucide-react'
import Button from '../components/Button'
import Input from '../components/Input'
import { useStore } from '../store/StoreContext'
import { testConnection, type TestResult } from '../api/minimax'
import type { Endpoint } from '../store/types'
import s from './WelcomeView.module.css'

export default function WelcomeView() {
  const { state, dispatch } = useStore()
  const nav = useNavigate()

  const [endpoint, setEndpoint] = useState<Endpoint>(state.settings.endpoint)
  const [apiKey, setApiKey] = useState(state.settings.apiKey)
  const [model, setModel] = useState(state.settings.model)
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
    const result = await testConnection(endpoint, apiKey, model)
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
        model,
        configured: true,
      },
    })
    nav('/')
  }

  return (
    <div className={s.page}>
      <div className={s.card}>
        <div className={s.head}>
          <div className={s.logo}>
            <span>💬</span>
          </div>
          <h1 className={s.title}>minichat</h1>
          <p className={s.subtitle}>
            基于 MiniMax M3 的角色扮演聊天工具 · 数据全部存在你本地浏览器
          </p>
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

        <div className={s.form}>
          <div className={s.section}>
            <h3 className={s.sectionTitle}>1. 选择 Endpoint</h3>
            <div className={s.segment}>
              <button
                type="button"
                className={[s.seg, endpoint === 'global' ? s.segActive : ''].join(' ')}
                onClick={() => {
                  setEndpoint('global')
                  setModel('MiniMax-M3')
                  setTest(null)
                }}
              >
                国际版
                <span className={s.segHint}>minimax.io · M3</span>
              </button>
              <button
                type="button"
                className={[s.seg, endpoint === 'cn' ? s.segActive : ''].join(' ')}
                onClick={() => {
                  setEndpoint('cn')
                  setModel('M2-her')
                  setTest(null)
                }}
              >
                国内版
                <span className={s.segHint}>minimaxi.com · M2-her</span>
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
            <h3 className={s.sectionTitle}>3. 模型名称（可改）</h3>
            <Input
              value={model}
              onChange={(e) => {
                setModel(e.target.value)
                setTest(null)
              }}
              placeholder={endpoint === 'global' ? 'MiniMax-M3' : 'M2-her'}
              hint="留空将使用默认值。"
            />
          </div>

          <div className={s.section}>
            <h3 className={s.sectionTitle}>4. 测试联通</h3>
            <div className={s.testRow}>
              <Button
                variant="secondary"
                onClick={onTest}
                loading={testing}
                disabled={!apiKey || !model}
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
