import { useState } from 'react'
import { Eye, EyeOff, RotateCcw, Trash2, AlertTriangle } from 'lucide-react'
import Drawer from './Drawer'
import Button from './Button'
import Input from './Input'
import { useStore } from '../store/StoreContext'
import { testConnection, type TestResult } from '../api/minimax'
import type { Endpoint } from '../store/types'
import s from './SettingsDrawer.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

export default function SettingsDrawer({ open, onClose }: Props) {
  const { state, dispatch } = useStore()
  const settings = state.settings

  const [endpoint, setEndpoint] = useState<Endpoint>(settings.endpoint)
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [chatModel, setChatModel] = useState(settings.chatModel)
  const [generationModel, setGenerationModel] = useState(settings.generationModel)
  const [temperature, setTemperature] = useState(settings.temperature)
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens)
  const [showKey, setShowKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<TestResult | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const isDirty =
    endpoint !== settings.endpoint ||
    apiKey !== settings.apiKey ||
    chatModel !== settings.chatModel ||
    generationModel !== settings.generationModel ||
    temperature !== settings.temperature ||
    maxTokens !== settings.maxTokens

  const save = () => {
    dispatch({
      type: 'set-settings',
      payload: {
        ...settings,
        endpoint,
        apiKey,
        chatModel,
        generationModel,
        temperature,
        maxTokens,
        configured: !!apiKey,
      },
    })
    onClose()
  }

  const onTest = async () => {
    setTesting(true)
    setTest(null)
    // 测试联通用对话模型
    const result = await testConnection(endpoint, apiKey, chatModel)
    setTest(result)
    setTesting(false)
  }

  const resetForm = () => {
    setEndpoint(settings.endpoint)
    setApiKey(settings.apiKey)
    setChatModel(settings.chatModel)
    setGenerationModel(settings.generationModel)
    setTemperature(settings.temperature)
    setMaxTokens(settings.maxTokens)
    setTest(null)
  }

  const clearAll = () => {
    if (!confirm('确定要清空所有人物和对话数据吗？此操作不可撤销。')) return
    dispatch({ type: 'clear-all' })
    setConfirmReset(false)
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="设置"
      width={480}
      footer={
        <>
          <Button variant="ghost" onClick={resetForm} disabled={!isDirty || testing}>
            <RotateCcw size={14} />
            还原
          </Button>
          <Button variant="primary" onClick={save} disabled={!isDirty || !apiKey}>
            保存
          </Button>
        </>
      }
    >
      <section className={s.section}>
        <h3 className={s.h3}>API 配置</h3>

        <div className={s.field}>
          <label className={s.label}>Endpoint</label>
          <div className={s.segment}>
            <button
              type="button"
              className={[s.seg, endpoint === 'global' ? s.segActive : ''].join(' ')}
              onClick={() => {
                setEndpoint('global')
                setTest(null)
              }}
            >
              国际 (minimax.io)
            </button>
            <button
              type="button"
              className={[s.seg, endpoint === 'cn' ? s.segActive : ''].join(' ')}
              onClick={() => {
                setEndpoint('cn')
                setTest(null)
              }}
            >
              国内 (minimaxi.com)
            </button>
          </div>
          <p className={s.hint}>
            国际版推荐使用 MiniMax-M3；国内版推荐使用 M2-her（专为对话场景优化）。
          </p>
        </div>

        <div className={s.field}>
          <label className={s.label}>API Key</label>
          <div className={s.keyRow}>
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
              aria-label={showKey ? '隐藏' : '显示'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className={s.hint}>
            密钥仅保存在浏览器 localStorage，不会上传到任何服务器。
          </p>
        </div>

        <div className={s.modelGroup}>
          <Input
            label="对话模型（跑角色聊天）"
            value={chatModel}
            onChange={(e) => {
              setChatModel(e.target.value)
              setTest(null)
            }}
            placeholder="M2-her"
            hint="默认 M2-her。角色对话会使用这个模型。"
          />
          <Input
            label="生成模型（AI 写人设、示例）"
            value={generationModel}
            onChange={(e) => {
              setGenerationModel(e.target.value)
              setTest(null)
            }}
            placeholder="MiniMax-M3"
            hint="默认 MiniMax-M3。生成类任务使用这个模型。"
          />
        </div>

        <div className={s.row}>
          <div className={s.col}>
            <label className={s.label}>Temperature</label>
            <div className={s.sliderRow}>
              <input
                type="range"
                min={0}
                max={1.5}
                step={0.05}
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className={s.slider}
              />
              <span className={s.sliderVal}>{temperature.toFixed(2)}</span>
            </div>
            <p className={s.hint}>越低越稳定，越高越发散。</p>
          </div>
          <div className={s.col}>
            <Input
              label="Max Tokens"
              type="number"
              min={64}
              max={2048}
              value={maxTokens}
              onChange={(e) =>
                setMaxTokens(Math.max(64, Math.min(2048, parseInt(e.target.value) || 2048)))
              }
            />
          </div>
        </div>

        <div className={s.testArea}>
          <Button
            variant="secondary"
            onClick={onTest}
            loading={testing}
            disabled={!apiKey || !chatModel}
          >
            测试连接（{chatModel || '对话模型'}）
          </Button>
          {test ? (
            <div className={[s.testResult, test.ok ? s.testOk : s.testFail].join(' ')}>
              <div className={s.testLine}>
                {test.ok ? '✅ ' : '❌ '}
                {test.message}
                {test.latencyMs != null ? ` · ${test.latencyMs}ms` : ''}
              </div>
              {test.reply ? (
                <div className={s.testReply}>模型回声："{test.reply}"</div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className={[s.section, s.dangerSection].join(' ')}>
        <h3 className={s.h3}>
          <AlertTriangle size={16} />
          危险操作
        </h3>
        {!confirmReset ? (
          <Button variant="danger" onClick={() => setConfirmReset(true)} icon={<Trash2 size={14} />}>
            清空所有数据
          </Button>
        ) : (
          <div className={s.confirmRow}>
            <span className={s.confirmText}>
              将删除所有人物和对话（API Key 保留）。确定吗？
            </span>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={clearAll}>
              确认清空
            </Button>
          </div>
        )}
      </section>
    </Drawer>
  )
}
