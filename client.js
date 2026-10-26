window.__ModuleLoader__.load({
  id: '@moreweb/edh',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Dictionary namespace owned by this plugin. */
    const NS = 'edh'
    /** Feature rows are the rows whose module lives under the package prefix. */
    const FEATURE_PREFIX = '@moreweb/edh/'
    /** The row that carries message editing; the browser half reads its enablement. */
    const EDIT_MODULE = '@moreweb/edh/edit'
    /** The row that carries Markdown export; the browser half reads its enablement. */
    const EXPORT_MODULE = '@moreweb/edh/export'
    /** The row that carries the update feature; the browser half reads its enablement. */
    const UPDATE_MODULE = '@moreweb/edh/update'
    /** This bundle's own package name: the Plugin Manager subject and the module id. */
    const PACKAGE_NAME = '@moreweb/edh'

    const en = {
      label: 'EDH',
      aria: 'EDH features',
      hintOn: 'EDH is on. Click to pause its features.',
      hintOff: 'EDH is off. Click to turn its features back on.',
      unavailable: 'EDH has no feature rows loaded.',
      failed: 'The switch could not be changed. Open Plugins to check the rows.',
      restart: 'Saved. This change applies after the next app restart.',
      copy: 'Copy',
      copied: 'Copied',
      edit: 'Edit message',
      editFailed: 'The message could not be opened for editing.',
      export: 'Export as Markdown',
      update: 'Update EDH',
      updateHint: 'Check for a published EDH update.',
      updateTo: 'Update to {version}',
      updateToHint: 'Download and apply EDH {version}. Its checkout must have no local changes.',
      checking: 'Checking…',
      checkingHint: 'Reading the published EDH version.',
      upToDate: 'Up to date',
      upToDateHint: 'EDH {version} is the published version.',
      notCheckout: 'Not a checkout',
      notCheckoutHint: 'EDH was not installed from a git checkout, so it cannot update itself here.',
      updating: 'Updating…',
      updatingHint: 'Fast-forwarding the EDH checkout.',
      updated: 'Updated',
      updatedHint: 'EDH is now {version}.',
      restartToFinish: 'Restart to finish',
      restartHint: 'EDH is now {version}. The new host half lands on restart.',
      checkFailed: 'Check failed',
      updateFailed: 'Update failed',
      offlineHint: 'No network: the published version could not be read.',
      dirtyHint: 'EDH has uncommitted changes, so nothing was changed.',
      errorHint: 'The update could not be applied. Open Plugins to check the EDH rows.',
    }
    const zh = {
      label: 'EDH',
      aria: 'EDH 功能开关',
      hintOn: 'EDH 已开启，点击暂停全部功能。',
      hintOff: 'EDH 已关闭，点击恢复全部功能。',
      unavailable: 'EDH 没有已装载的功能行。',
      failed: '开关未能修改，请到「插件」页查看对应行。',
      restart: '已保存，下次重启应用后生效。',
      copy: '复制',
      copied: '已复制',
      edit: '编辑消息',
      editFailed: '无法打开该消息进行编辑。',
      export: '导出为 Markdown',
      update: '更新 EDH',
      updateHint: '检查已发布的 EDH 版本。',
      updateTo: '更新到 {version}',
      updateToHint: '下载并应用 EDH {version}，检出目录需无本地改动。',
      checking: '检查中…',
      checkingHint: '正在读取已发布的 EDH 版本。',
      upToDate: '已是最新',
      upToDateHint: 'EDH {version} 就是已发布的版本。',
      notCheckout: '不是 git 检出',
      notCheckoutHint: 'EDH 不是从 git 检出安装的，无法在此自行更新。',
      updating: '更新中…',
      updatingHint: '正在快进 EDH 检出目录。',
      updated: '已更新',
      updatedHint: 'EDH 现在是 {version}。',
      restartToFinish: '重启以完成',
      restartHint: 'EDH 现在是 {version}，新的宿主部分将在重启后生效。',
      checkFailed: '检查失败',
      updateFailed: '更新失败',
      offlineHint: '无网络：无法读取已发布版本。',
      dirtyHint: 'EDH 有未提交的改动，未做任何修改。',
      errorHint: '更新未能应用，请到「插件」页查看 EDH 对应行。',
    }

    /**
     * The rows EDH owns besides its shell: anything under `@moreweb/edh/…`.
     * @param entries - the Plugin Manager's plugin list.
     * @returns the feature rows, in list order.
     */
    function findFeatures(entries) {
      const list = Array.isArray(entries) ? entries : []
      return list.filter(entry => entry !== null && typeof entry === 'object'
        && typeof entry.moduleName === 'string'
        && entry.moduleName.startsWith(FEATURE_PREFIX)
        && typeof entry.entryId === 'string')
    }

    /** Accept either the RemoteResult wrapper or the raw value. */
    function unwrap(result) {
      if (result !== null && typeof result === 'object' && typeof result.ok === 'boolean') {
        return result.ok ? { ok: true, value: result.value } : { ok: false, value: undefined }
      }
      return { ok: true, value: result }
    }

    /**
     * Last-state breadcrumb: the page keeps the latest read, mount box, and last
     * write result under one Local Storage key. It is diagnostic only — a refused
     * write never affects the switch.
     */
    const DEBUG_KEY = 'edh:debug'
    /** Separate breadcrumb for message editing, so the switch trace stays readable. */
    const EDIT_DEBUG_KEY = 'edh:edit'
    /** Separate breadcrumb for Markdown export. */
    const EXPORT_DEBUG_KEY = 'edh:export'
    /** Separate breadcrumb for the update action. */
    const UPDATE_DEBUG_KEY = 'edh:update'

    function writeBreadcrumb(key, payload) {
      try {
        window.localStorage.setItem(key, JSON.stringify({ at: Date.now(), ...payload }))
      } catch (error) {
        // A storage refusal must never break a feature.
      }
    }

    function debugWrite(payload) {
      writeBreadcrumb(DEBUG_KEY, payload)
    }

    function editWrite(payload) {
      writeBreadcrumb(EDIT_DEBUG_KEY, payload)
    }

    function exportWrite(payload) {
      writeBreadcrumb(EXPORT_DEBUG_KEY, payload)
    }

    function updateWrite(payload) {
      writeBreadcrumb(UPDATE_DEBUG_KEY, payload)
    }

    /** One error's text, whatever was thrown. */
    function messageOf(error) {
      return String(error?.message ?? error)
    }

    /**
     * The switch's state machine: read the feature rows, write their enablement,
     * and publish pending / failed / restart notes to subscribers.
     * @param remote - the `remote.pluginManager` namespace.
     */
    function createController(remote) {
      const state = { status: 'loading', enabled: false, pending: false, note: '', features: 0, moduleStates: {} }
      const listeners = new Set()
      /** Entry ids of the feature rows read by the last successful refresh. */
      let featureRows = []

      const publish = patch => {
        Object.assign(state, patch)
        for (const listener of [...listeners]) listener()
      }

      const subscribe = listener => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }

      const refresh = async () => {
        let result
        try {
          result = await remote.listPlugins()
        } catch (error) {
          console.error('[edh] plugin list read failed:', error)
          debugWrite({ phase: 'list-threw', message: String(error?.message ?? error) })
          publish({ status: 'error', pending: false })
          return
        }
        const read = unwrap(result)
        if (!read.ok) {
          debugWrite({ phase: 'list-refused' })
          publish({ status: 'error', pending: false })
          return
        }
        const features = findFeatures(read.value)
        featureRows = features.map(feature => feature.entryId)
        const enabled = features.length > 0 && features.every(feature => feature.enabled === true)
        /** Per-row enablement, so one feature can gate its own UI independently. */
        const moduleStates = {}
        for (const feature of features) moduleStates[feature.moduleName] = feature.enabled === true
        debugWrite({
          phase: features.length === 0 ? 'no-features' : 'features',
          count: features.length,
          enabled,
          moduleNames: features.map(feature => feature.moduleName),
        })
        if (features.length === 0) {
          publish({ status: 'unavailable', pending: false, enabled: false, features: 0, moduleStates })
          return
        }
        publish({ status: 'ready', enabled, pending: false, features: features.length, moduleStates })
      }

      const toggle = async () => {
        if (state.pending || state.status !== 'ready' || featureRows.length === 0) return
        const next = !state.enabled
        publish({ pending: true, note: '' })
        const applications = []
        for (const entryId of featureRows) {
          let result
          try {
            result = await remote.setPluginEnabled(entryId, next)
          } catch (error) {
            console.error('[edh] feature enablement write failed:', error)
            debugWrite({ phase: 'write-threw', entryId, message: String(error?.message ?? error), next })
            publish({ pending: false, note: 'failed' })
            await refresh()
            return
          }
          const change = unwrap(result)
          if (!change.ok) {
            debugWrite({ phase: 'write-refused', entryId, next })
            publish({ pending: false, note: 'failed' })
            await refresh()
            return
          }
          applications.push(change.value?.application)
        }
        debugWrite({ phase: 'write-result', next, applications })
        if (applications.every(application => application === 'applied')) {
          publish({ pending: false, enabled: next })
        } else if (applications.some(application => application === 'restart-required')) {
          publish({ pending: false, enabled: next, note: 'restart' })
        } else {
          publish({ pending: false, note: 'failed' })
        }
        await refresh()
      }

      return {
        getSnapshot: () => state,
        subscribe,
        refresh,
        toggle,
      }
    }

    /**
     * Whether one feature row is loaded and enabled right now.
     *
     * A profile whose bundle patch predates a row (an upgrade that has not been
     * restarted yet) simply has no entry for it; that case follows the aggregate
     * instead of silently switching the feature off. A feature that needs its
     * own Host half cannot use that fallback — see `rowEnabled`.
     *
     * Kept pure so the Node test can exercise it without a browser.
     * @param snapshot - a `createController` snapshot.
     * @param moduleName - the row's module name, e.g. `@moreweb/edh/edit`.
     */
    function featureEnabled(snapshot, moduleName) {
      if (snapshot === null || typeof snapshot !== 'object') return false
      if (snapshot.status !== 'ready') return false
      const states = snapshot.moduleStates
      if (states === null || typeof states !== 'object') return false
      if (Object.prototype.hasOwnProperty.call(states, moduleName)) return states[moduleName] === true
      return snapshot.enabled === true
    }

    /**
     * Whether one feature row is *present and* enabled — no aggregate fallback.
     *
     * For a feature whose UI is useless without its Host half: before the
     * restart that mounts a new row, the button would otherwise appear in front
     * of a route that does not exist yet.
     * @param snapshot - a `createController` snapshot.
     * @param moduleName - the row's module name.
     */
    function rowEnabled(snapshot, moduleName) {
      if (snapshot === null || typeof snapshot !== 'object') return false
      if (snapshot.status !== 'ready') return false
      const states = snapshot.moduleStates
      if (states === null || typeof states !== 'object') return false
      return states[moduleName] === true
    }

    /**
     * One hook per feature row: true while that row is loaded and enabled.
     * @param controller - the switch controller holding the row states.
     * @param moduleName - the row's module name, e.g. `@moreweb/edh/export`.
     * @param isEnabled - the enablement rule; `rowEnabled` when the row's own
     *   presence matters, `featureEnabled` when the aggregate may stand in.
     */
    function createFeatureHook(controller, moduleName, isEnabled = featureEnabled) {
      return function useFeatureEnabled() {
        const [enabled, setEnabled] = React.useState(() => isEnabled(controller.getSnapshot(), moduleName))
        React.useEffect(() => {
          const sync = () => {
            const next = isEnabled(controller.getSnapshot(), moduleName)
            setEnabled(previous => (previous === next ? previous : next))
          }
          sync()
          return controller.subscribe(sync)
        }, [])
        return enabled
      }
    }

    /** Build the switch component over one controller and its translator. */
    function createSwitch(t, controller) {
      return function EdhSwitch() {
        const [snapshot, setSnapshot] = React.useState(() => ({ ...controller.getSnapshot() }))
        const [hover, setHover] = React.useState(false)
        const ref = React.useRef(null)
        React.useEffect(() => {
          const sync = () => setSnapshot({ ...controller.getSnapshot() })
          sync()
          return controller.subscribe(sync)
        }, [])
        React.useEffect(() => {
          const element = ref.current
          if (element !== null) {
            const rect = element.getBoundingClientRect()
            debugWrite({
              phase: 'mounted',
              status: controller.getSnapshot().status,
              box: {
                x: Math.round(rect.x),
                y: Math.round(rect.y),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              },
            })
          }
        }, [])

        const ready = snapshot.status === 'ready'
        const enabled = snapshot.enabled === true
        const busy = snapshot.pending || !ready
        const title = snapshot.note !== ''
          ? t(snapshot.note)
          : snapshot.status === 'unavailable'
            ? t('unavailable')
            : ready ? (enabled ? t('hintOn') : t('hintOff')) : snapshot.status === 'error' ? t('failed') : t('label')

        return h('button', {
          ref,
          type: 'button',
          role: 'switch',
          'aria-checked': enabled,
          'aria-label': t('aria'),
          'aria-busy': snapshot.pending || undefined,
          title,
          disabled: busy,
          onClick: () => {
            void controller.toggle()
          },
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            height: '24px',
            padding: '0 8px',
            border: 'none',
            borderRadius: '6px',
            background: hover && !busy ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
            color: enabled ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
            font: 'inherit',
            fontSize: '12px',
            lineHeight: '16px',
            whiteSpace: 'nowrap',
            cursor: busy ? 'default' : 'pointer',
            opacity: ready ? 1 : 0.55,
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background 120ms ease, color 120ms ease, opacity 120ms ease',
          },
        },
          h('span', null, t('label')),
          h('span', {
            'aria-hidden': true,
            style: {
              position: 'relative',
              display: 'inline-block',
              boxSizing: 'border-box',
              width: '22px',
              height: '12px',
              borderRadius: '999px',
              background: enabled ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-bg-layer-2)',
              border: enabled ? '1px solid transparent' : '1px solid var(--dsw-alias-border-l1)',
              flexShrink: 0,
              transition: 'background 120ms ease',
            },
          },
            h('span', {
              style: {
                position: 'absolute',
                top: '1px',
                left: enabled ? '11px' : '1px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: enabled ? 'var(--dsw-alias-bg-base)' : 'var(--dsw-alias-label-secondary)',
                transition: 'left 120ms ease',
              },
            }),
          ),
        )
      }
    }

    // ---------------------------------------------------------------------
    // Message editing
    //
    // The Session log is append-only, so there is no in-place rewrite. Editing
    // a message therefore means: fork the Session immediately before that
    // message, then hand the text back to the composer of the fork. The
    // original conversation is preserved, and the user edits and resends in the
    // real composer.
    // ---------------------------------------------------------------------

    /**
     * Split one user message body the way the shipped bubble does.
     * @param content - the message content blocks.
     * @returns joined text, attachment entries, and the remaining blocks.
     */
    function contentParts(content) {
      const texts = []
      const attachments = []
      const rest = []
      const blocks = Array.isArray(content) ? content : []
      for (const block of blocks) {
        const b = block
        if (b === null || typeof b !== 'object') continue
        if (b.type === 'text' && typeof b.text === 'string') texts.push(b.text)
        else if (b.type === 'image' && b.attachment !== undefined) attachments.push({ type: 'image', image: { attachment: b.attachment } })
        else if (b.type === 'file' && b.attachment !== undefined) attachments.push({ type: 'file', file: b.attachment })
        else rest.push(block)
      }
      return { text: texts.join(''), attachments, rest }
    }

    /** Copies of the shipped 16px outline glyphs, so the row matches its neighbours. */
    function glyph(children) {
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 16 16',
        fill: 'none',
        xmlns: 'http://www.w3.org/2000/svg',
        'aria-hidden': 'true',
        strokeWidth: 1,
      }, children)
    }

    function EditIcon() {
      return glyph([
        h('path', {
          key: 'body',
          d: 'M8.85596 2.69971H4.19971C3.37141 2.69971 2.69992 3.37146 2.69971 4.19971V11.8003C2.69992 12.6285 3.37141 13.3003 4.19971 13.3003H11.8003C12.6283 13.2999 13.3001 12.6283 13.3003 11.8003V7.89893H14.3003V11.8003C14.3001 13.1806 13.1806 14.2999 11.8003 14.3003H4.19971C2.81913 14.3003 1.69992 13.1808 1.69971 11.8003V4.19971C1.69992 2.81918 2.81913 1.69971 4.19971 1.69971H8.85596V2.69971Z',
          fill: 'currentColor',
        }),
        h('path', { key: 'pen', d: 'M7.7849 8.23878L13.888 2.13574', stroke: 'currentColor' }),
      ])
    }

    function CopyIcon() {
      return glyph([
        h('rect', {
          key: 'sheet',
          x: '1.52075',
          y: '4.07373',
          width: '10.3932',
          height: '10.3932',
          rx: '2',
          stroke: 'currentColor',
        }),
        h('path', {
          key: 'back',
          d: 'M11.9792 1.53296C13.36 1.53296 14.4792 2.65225 14.4792 4.03296V9.42847C14.4792 10.3756 13.9521 11.1987 13.1755 11.6228V10.3298C13.3652 10.0787 13.4792 9.7674 13.4792 9.42847V4.03296C13.4792 3.20453 12.8077 2.53296 11.9792 2.53296H6.58374C6.27966 2.53301 5.99684 2.6235 5.7605 2.77905H4.42358C4.85652 2.03463 5.66056 1.53304 6.58374 1.53296H11.9792Z',
          fill: 'currentColor',
        }),
      ])
    }

    function CheckIcon() {
      return glyph(h('path', {
        d: 'M2.25 8.5L5.49732 11.7473C5.90519 12.1552 6.57263 12.1344 6.95426 11.7018L13.75 4',
        stroke: 'currentColor',
      }))
    }

    /** The shipped 16px download glyph. */
    function DownloadIcon() {
      return glyph([
        h('path', { key: 'shaft', d: 'M8 1.95317V10.0469', stroke: 'currentColor' }),
        h('path', { key: 'head', d: 'M4.25 6.29688L8 10.0469L11.75 6.29688', stroke: 'currentColor' }),
        h('path', {
          key: 'tray',
          d: 'M1.5 10.0469V13.158C1.5 13.3937 1.60536 13.6198 1.79289 13.7865C1.98043 13.9532 2.23478 14.0469 2.5 14.0469H13.5C13.7652 14.0469 14.0196 13.9532 14.2071 13.7865C14.3946 13.6198 14.5 13.3937 14.5 13.158V10.0469',
          stroke: 'currentColor',
        }),
      ])
    }

    const CLOCK_TIME = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
    const CLOCK_DATE = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

    function startOfLocalDay(milliseconds) {
      const date = new Date(milliseconds)
      return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    }

    /** Message clock: time of day for today, dated otherwise. */
    function formatClock(time) {
      if (typeof time !== 'number' || !Number.isFinite(time)) return ''
      return startOfLocalDay(time) === startOfLocalDay(Date.now())
        ? CLOCK_TIME.format(new Date(time))
        : CLOCK_DATE.format(new Date(time))
    }

    /** Clipboard write with the legacy selection fallback. */
    async function copyText(text) {
      try {
        const clipboard = navigator.clipboard
        if (clipboard !== undefined && typeof clipboard.writeText === 'function') {
          await clipboard.writeText(text)
          return true
        }
      } catch (error) {
        // Fall through to the selection-based path.
      }
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.top = '-1000px'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const copied = document.execCommand('copy')
        document.body.removeChild(area)
        return copied === true
      } catch (error) {
        return false
      }
    }

    /**
     * Hand-off from the message the user clicked to the composer of the fork.
     * Filled before the fork opens, drained by the Session it belongs to.
     */
    const pendingDrafts = new Map()
    /** A hand-off older than this is stale and dropped instead of replayed. */
    const PENDING_TTL_MS = 60_000

    function rememberDraft(sessionId, text) {
      const now = Date.now()
      for (const [key, entry] of pendingDrafts) {
        if (now - entry.at > PENDING_TTL_MS) pendingDrafts.delete(key)
      }
      pendingDrafts.set(sessionId, { text, at: now })
    }

    /**
     * Fork the Session just before `seq` and open the fork.
     * @param ctx - the browser plugin context.
     * @param sessionId - the Session the edited message belongs to.
     * @param seq - the edited message's own event sequence number.
     * @param text - the message body to place in the fork's composer.
     */
    async function requestEdit(ctx, sessionId, seq, text) {
      editWrite({ phase: 'click', sessionId, seq, length: text.length })
      let childId
      try {
        childId = await ctx.sessions.fork({ sessionId, atSeq: seq - 1, increaseTitle: true })
      } catch (error) {
        editWrite({ phase: 'fork-failed', sessionId, seq, message: String(error?.message ?? error) })
        return undefined
      }
      if (typeof childId !== 'string' || childId === '') {
        editWrite({ phase: 'fork-empty', sessionId, seq, childId: String(childId) })
        return undefined
      }
      rememberDraft(childId, text)
      editWrite({ phase: 'forked', sessionId, seq, childId })
      try {
        ctx.uiWorkspace.openSession(childId)
      } catch (error) {
        editWrite({ phase: 'open-failed', childId, message: String(error?.message ?? error) })
      }
      return childId
    }

    /**
     * One icon button in the message action row.
     * @param props - accessible label, click handler, and glyph.
     */
    function IconAction({ label, onClick, disabled = false, children }) {
      return h('button', {
        type: 'button',
        className: 'edh-action',
        'aria-label': label,
        title: label,
        'data-unavailable': disabled || undefined,
        onClick: disabled ? undefined : onClick,
      }, children)
    }

    /** The message action row: clock, copy, and — when the feature is on — edit. */
    function MessageActions({ text, time, t, canEdit, onEdit }) {
      const [copied, setCopied] = React.useState(false)
      const timer = React.useRef(null)
      React.useEffect(() => () => {
        if (timer.current !== null) clearTimeout(timer.current)
      }, [])
      const onCopy = React.useCallback(() => {
        if (copied) return
        void copyText(text).then(ok => {
          if (!ok) return
          setCopied(true)
          timer.current = window.setTimeout(() => {
            timer.current = null
            setCopied(false)
          }, 1e3)
        })
      }, [copied, text])
      const clock = time === undefined ? null : h('span', { className: 'edh-timeStart' }, formatClock(time))
      return h('div', { className: 'edh-actions', 'data-clock': 'start' },
        clock,
        h(IconAction, { label: copied ? t('copied') : t('copy'), onClick: onCopy }, copied ? h(CheckIcon) : h(CopyIcon)),
        canEdit ? h(IconAction, { label: t('edit'), onClick: onEdit }, h(EditIcon)) : null,
      )
    }

    /**
     * Replacement for the shipped `user` Chat renderer.
     *
     * The bubble itself still comes from the shipped `conversation.chat.user.content`
     * Factory, so only the action row is ours: the shipped one has no seam that a
     * plugin can extend on a user row.
     */
    function createUserMessageView(t, controller, ctx) {
      /** One-shot probe so a failed shadow is diagnosable without browser control. */
      let reported = false

      const useEditEnabled = createFeatureHook(controller, EDIT_MODULE)

      return React.memo(function EdhUserMessageNodeView({ node, renderFactorySlot, loadImage, sessionId }) {
        const data = node?.data ?? {}
        const editEnabled = useEditEnabled()
        const [busy, setBusy] = React.useState(false)

        // Report once that this renderer is the one painting, and whether the
        // props it needs actually arrived.
        React.useEffect(() => {
          if (reported) return
          reported = true
          editWrite({
            phase: 'view-mounted',
            sessionId: typeof sessionId === 'string' && sessionId !== '',
            factory: typeof renderFactorySlot === 'function',
            seq: typeof data.seq === 'number',
            editEnabled,
          })
        }, [])

        // A row without a Session id cannot fork; leave a trace so the reason is
        // visible instead of an Edit action that silently never appears.
        React.useEffect(() => {
          if (typeof sessionId !== 'string' || sessionId === '') {
            editWrite({ phase: 'no-session-id', nodeKey: String(node?.key ?? '') })
          }
        }, [sessionId, node])

        const parts = React.useMemo(() => contentParts(data.content), [data.content])
        const prepared = React.useMemo(() => ({
          text: parts.text,
          attachments: parts.attachments,
          extraBlocks: parts.rest,
          ...(data.referenceLabels === undefined ? {} : { referenceLabels: data.referenceLabels }),
        }), [parts, data.referenceLabels])
        const facts = React.useMemo(() => ({
          ...(data.referenceLabels === undefined ? {} : { sessionLabels: data.referenceLabels }),
          ...(data.skillNames === undefined ? {} : { skillNames: data.skillNames }),
        }), [data.referenceLabels, data.skillNames])

        const body = typeof renderFactorySlot === 'function'
          ? renderFactorySlot('conversation.chat.user.content', {
            content: prepared,
            loadImage,
            facts,
            interactive: true,
          })
          : h('div', { className: 'edh-bubble' }, prepared.text)

        const seq = data.seq
        const canEdit = editEnabled
          && !busy
          && typeof seq === 'number'
          && Number.isFinite(seq)
          && seq > 0
          && typeof sessionId === 'string'
          && sessionId !== ''

        const onEdit = React.useCallback(() => {
          if (!canEdit) return
          setBusy(true)
          void requestEdit(ctx, sessionId, seq, parts.text).finally(() => setBusy(false))
        }, [canEdit, sessionId, seq, parts.text])

        return h('div', { className: 'edh-userRow' },
          body,
          h(MessageActions, { text: parts.text, time: data.time, t, canEdit, onEdit }),
        )
      })
    }

    /**
     * Drains the hand-off for the Session it belongs to and seeds the composer.
     *
     * The composer publishes its own draft on bind, so the seed is re-applied on
     * the next frame and once more shortly after; each attempt is idempotent.
     */
    function PendingEditConsumer({ sessionId, session, inputActions }) {
      const actions = React.useRef(inputActions)
      actions.current = inputActions
      const resolved = typeof sessionId === 'string' && sessionId !== ''
        ? sessionId
        : (typeof session?.sessionId === 'string' ? session.sessionId : undefined)

      React.useEffect(() => {
        if (resolved === undefined) return
        const handoff = pendingDrafts.get(resolved)
        if (handoff === undefined) return
        if (Date.now() - handoff.at > PENDING_TTL_MS) {
          pendingDrafts.delete(resolved)
          return
        }
        // Consume only on a successful write, so a composer that mounts a beat
        // late still gets the text on one of the retries below.
        const apply = () => {
          const target = actions.current
          if (target === undefined || typeof target.setDraft !== 'function') return
          if (!pendingDrafts.has(resolved)) return
          target.setDraft(handoff.text)
          pendingDrafts.delete(resolved)
          editWrite({ phase: 'draft-applied', sessionId: resolved, length: handoff.text.length })
        }
        apply()
        const frame = window.requestAnimationFrame(apply)
        const timer = window.setTimeout(apply, 120)
        return () => {
          window.cancelAnimationFrame(frame)
          clearTimeout(timer)
        }
      }, [resolved])

      return null
    }

    /**
     * The rewritten user row. Class names are ours, but every rule and token is
     * copied from the shipped MessageItem / MessageIconActions modules so the row
     * keeps its place in the hover reveal and its exact metrics.
     */
    const EDIT_CSS = [
      '.edh-userRow{flex-direction:column;align-items:flex-end;gap:6px;display:flex}',
      '.edh-actions{height:calc(28px + var(--dsh-content-font-delta,0px));align-items:center;gap:8px;display:flex}',
      '.edh-timeStart{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-tertiary);white-space:nowrap;padding-right:12px}',
      '@media (hover:hover){',
      ':is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]):has(~:is([data-chat-flow-kind=user],[data-chat-flow-kind=steering])) .edh-actions{opacity:0;transition:opacity 80ms}',
      ':is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]):has(~:is([data-chat-flow-kind=user],[data-chat-flow-kind=steering])):hover .edh-actions,',
      ':is([data-chat-flow-kind=user],[data-chat-flow-kind=steering]):has(~:is([data-chat-flow-kind=user],[data-chat-flow-kind=steering])):focus-within .edh-actions{opacity:1}',
      '}',
      '.edh-action{width:calc(28px + var(--dsh-content-font-delta,0px));height:calc(28px + var(--dsh-content-font-delta,0px));border-radius:var(--dsw-radius-sm);color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:none;justify-content:center;align-items:center;padding:6px;display:inline-flex}',
      '.edh-action svg{width:calc(15px + var(--dsh-content-font-delta,0px));height:calc(15px + var(--dsh-content-font-delta,0px))}',
      '.edh-action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '.edh-action[data-unavailable]{cursor:default;opacity:.4}',
      '.edh-action[data-unavailable]:hover{color:var(--dsw-alias-label-tertiary);background:0 0}',
      '.edh-bubble{background:var(--dsw-specific-bubble);border-radius:var(--dsw-radius-xl);max-width:100%;font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px));color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word;padding:10px 16px}',
    ].join('')

    /** Install the row stylesheet once and take it back out on dispose. */
    function installEditStyles() {
      if (typeof document === 'undefined') return () => {}
      const selector = 'style[data-edh-css="edit"]'
      if (document.querySelector(selector) === null) {
        const tag = document.createElement('style')
        tag.dataset.edhCss = 'edit'
        tag.dataset.plugin = '@moreweb/edh'
        tag.textContent = EDIT_CSS
        document.head.appendChild(tag)
        return () => {
          if (tag.parentNode !== null) tag.parentNode.removeChild(tag)
        }
      }
      return () => {
        const existing = document.querySelector(selector)
        if (existing !== null && existing.parentNode !== null) existing.parentNode.removeChild(existing)
      }
    }

    // ---------------------------------------------------------------------
    // Session export
    //
    // The document itself is built on the Host, which is the only place the
    // Session log can be read in full. The browser's job is to know the Session
    // it is looking at and hand the Host's download route to its own download
    // manager — the same hand-off the shipped Session-log export makes.
    // ---------------------------------------------------------------------

    /**
     * The Host route that answers one Session's Markdown document, in the
     * document-relative form the browser resolves against its own base — the
     * same hand-off the shipped Session-log export makes.
     */
    const EXPORT_ROUTE = 'api/edh.export'

    /**
     * Collapse a Session id into one filename segment. `export.js` owns the
     * same rule for the `content-disposition` header; the two must agree, and
     * `test/export.mjs` pins the shape.
     */
    function exportFilename(sessionId) {
      return `dsh-session-${String(sessionId).replace(/[^A-Za-z0-9_-]/gu, '_')}.md`
    }

    /**
     * Hand a document-relative Host route to the browser's download manager,
     * which resolves it against the document's own base.
     * @param url - document-relative route.
     * @param filename - browser download filename.
     */
    function downloadUrl(url, filename) {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
    }

    /**
     * The Session-header action that downloads the Session as Markdown.
     *
     * It reads the `export` row's enablement, so the master switch governs it
     * like every other EDH feature, and it disappears when no Session is open.
     */
    function createExportButton(t, controller) {
      // The button is pointless without the Host route its row mounts, so the
      // aggregate fallback is not good enough here.
      const useExportEnabled = createFeatureHook(controller, EXPORT_MODULE, rowEnabled)

      return function EdhExportButton({ sessionId }) {
        const enabled = useExportEnabled()
        const [hover, setHover] = React.useState(false)
        const available = enabled && typeof sessionId === 'string' && sessionId !== ''

        React.useEffect(() => {
          if (available) exportWrite({ phase: 'mounted', sessionId })
        }, [available, sessionId])

        if (!available) return null

        return h('button', {
          type: 'button',
          'aria-label': t('export'),
          title: t('export'),
          onClick: () => {
            const url = `${EXPORT_ROUTE}?${new URLSearchParams({ sessionId }).toString()}`
            exportWrite({ phase: 'click', sessionId, url })
            try {
              downloadUrl(url, exportFilename(sessionId))
            } catch (error) {
              exportWrite({ phase: 'failed', sessionId, message: String(error?.message ?? error) })
            }
          },
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            padding: 0,
            border: 'none',
            borderRadius: '6px',
            background: hover ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
            color: 'var(--dsw-alias-label-secondary)',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 120ms ease, color 120ms ease',
          },
        }, h(DownloadIcon))
      }
    }

    // ---------------------------------------------------------------------
    // Updating EDH
    //
    // The Host half owns the routes that read the published version and
    // fast-forward the checkout. The browser's job is the one control, in Plugin
    // Manager on EDH's own page, and the last step of an applied update: handing
    // this bundle's module to the client module system so the *new* browser half
    // runs without a page reload.
    // ---------------------------------------------------------------------

    /**
     * The Host route that answers one check (`GET`) and one apply (`POST`), in the
     * document-relative form the browser resolves against its own base.
     */
    const UPDATE_ROUTE = 'api/edh.update'

    /** Document-relative route the Host publishes graph and `rebuilt` frames on. */
    const EVENTS_ROUTE = 'plugins/events'

    /** How long the page waits for the Host to publish a new bundle revision. */
    const REVISION_TIMEOUT_MS = 8000

    /** A control that has not checked yet: it offers the check and nothing more. */
    const IDLE_UPDATE = Object.freeze({
      status: 'idle',
      stage: '',
      installed: '',
      latest: '',
      from: '',
      to: '',
      reason: '',
    })

    /**
     * Which Plugin Manager detail page a subject is, when it is EDH's own.
     *
     * The shipped page builds three subjects: `item` for an official catalog
     * entry, `row` for one configuration row, and `bundle` for one installed
     * package. Only the last two carry a package at all, and `subject.pkg.name`
     * is the bundle's own package name — the one field that identifies EDH
     * without guessing at a title, a row id, or a version.
     * @param subject - the page's subject prop.
     * @returns `bundle` or `row` for an EDH page, `undefined` for any other.
     */
    function updateSubject(subject) {
      if (subject === null || typeof subject !== 'object') return undefined
      const pkg = subject.pkg
      if (pkg === null || typeof pkg !== 'object' || pkg.name !== PACKAGE_NAME) return undefined
      return subject.kind === 'bundle' || subject.kind === 'row' ? subject.kind : undefined
    }

    /**
     * The state one check answer describes.
     * @param payload - the route's parsed answer.
     * @returns up to date, an update to offer, or why the check could not run.
     */
    function readCheck(payload) {
      const answer = payload !== null && typeof payload === 'object' ? payload : {}
      const installed = typeof answer.installed === 'string' ? answer.installed : ''
      const latest = typeof answer.latest === 'string' ? answer.latest : ''
      if (answer.ok !== true) {
        const reason = typeof answer.reason === 'string' ? answer.reason : 'error'
        return {
          status: reason === 'no-checkout' ? 'not-a-checkout' : 'failed',
          stage: 'check',
          installed,
          latest,
          from: '',
          to: '',
          reason,
        }
      }
      return {
        status: answer.available === true && latest !== '' ? 'update-available' : 'up-to-date',
        stage: 'check',
        installed,
        latest,
        from: '',
        to: '',
        reason: '',
      }
    }

    /**
     * The state one apply answer describes. Only an explicit `requiresRestart:
     * false` means the Host half was re-read in place; anything else says so
     * rather than offering a reload that would only load a second browser half.
     * @param payload - the route's parsed answer.
     */
    function readApply(payload) {
      const answer = payload !== null && typeof payload === 'object' ? payload : {}
      const from = typeof answer.from === 'string' ? answer.from : ''
      const to = typeof answer.to === 'string' ? answer.to : ''
      if (answer.ok !== true) {
        const reason = typeof answer.reason === 'string' ? answer.reason : 'error'
        return { status: 'failed', stage: 'apply', installed: from, latest: to, from, to, reason }
      }
      return {
        status: answer.requiresRestart === false ? 'updated-live' : 'updated-needs-restart',
        stage: 'apply',
        installed: to,
        latest: to,
        from,
        to,
        reason: '',
      }
    }

    /**
     * The tooltip for one refusal reason, in the words the routes answer with.
     * @param reason - `no-checkout`, `dirty`, `offline`, `error`, or anything else.
     * @returns the dictionary key of the sentence to show.
     */
    function failureNote(reason) {
      switch (reason) {
        case 'no-checkout': return 'notCheckoutHint'
        case 'dirty': return 'dirtyHint'
        case 'offline': return 'offlineHint'
        default: return 'errorHint'
      }
    }

    /**
     * The label and tooltip one update state offers.
     *
     * Kept pure so the Node test can pin the copy the control actually shows
     * instead of reading it back out of a rendered element.
     * @param state - the control's current state.
     * @param t - the dictionary's translate function.
     * @returns the visible label and the tooltip sentence.
     */
    function updateText(state, t) {
      const status = state !== null && typeof state === 'object' ? state.status : undefined
      const latest = typeof state?.latest === 'string' && state.latest !== '' ? state.latest : '?'
      switch (status) {
        case 'checking':
          return { label: t('checking'), title: t('checkingHint') }
        case 'update-available':
          return { label: t('updateTo', { version: latest }), title: t('updateToHint', { version: latest }) }
        case 'up-to-date':
          return { label: t('upToDate'), title: t('upToDateHint', { version: latest }) }
        case 'not-a-checkout':
          return { label: t('notCheckout'), title: t(failureNote('no-checkout')) }
        case 'updating':
          return { label: t('updating'), title: t('updatingHint') }
        case 'updated-live':
          return { label: t('updated'), title: t('updatedHint', { version: latest }) }
        case 'updated-needs-restart':
          return { label: t('restartToFinish'), title: t('restartHint', { version: latest }) }
        case 'failed':
          return {
            label: t(state.stage === 'apply' ? 'updateFailed' : 'checkFailed'),
            title: t(failureNote(state.reason)),
          }
        default:
          return { label: t('update'), title: t('updateHint') }
      }
    }

    /**
     * The revision one event frame reports for a module, when it is new.
     *
     * A `rebuilt` frame names the single module the Host just re-read; a `graph`
     * frame carries every row, which is how the page learns a revision a missed
     * rebuild frame already published.
     * @param text - one frame's `data` payload.
     * @param moduleId - the module to find.
     * @param previous - the revision the page is already running.
     * @returns the new revision, or `undefined` when the frame names none.
     */
    function revisionOfFrame(text, moduleId, previous) {
      let frame
      try {
        frame = JSON.parse(text)
      } catch (error) {
        return undefined
      }
      if (frame === null || typeof frame !== 'object') return undefined
      if (frame.type === 'rebuilt') {
        if (frame.id !== moduleId || typeof frame.rev !== 'string' || frame.rev === previous) return undefined
        return frame.rev
      }
      if (frame.type !== 'graph') return undefined
      const rows = frame.graph === null || typeof frame.graph !== 'object' ? undefined : frame.graph.modules
      const list = Array.isArray(rows) ? rows : []
      const row = list.find(entry => entry !== null && typeof entry === 'object' && entry.id === moduleId)
      if (row === undefined || typeof row.rev !== 'string' || row.rev === previous) return undefined
      return row.rev
    }

    /**
     * Split one text buffer into the payloads of the frames it holds.
     *
     * The Host writes `data: <json>` followed by a blank line per frame, so a
     * growing read keeps its unterminated tail for the next chunk.
     * @param buffer - the text read so far.
     * @returns each complete frame's payload, and the tail to carry forward.
     */
    function eventFrames(buffer) {
      const parts = String(buffer).split('\n\n')
      const rest = parts.pop() ?? ''
      const frames = []
      for (const part of parts) {
        const data = part.split('\n')
          .filter(line => line.startsWith('data:'))
          .map(line => line.slice(5).replace(/^ /u, ''))
          .join('\n')
        if (data !== '') frames.push(data)
      }
      return { frames, rest }
    }

    /** The revision the page booted with for one module. */
    function moduleRevision(modules, moduleId) {
      const rows = modules === null || modules === undefined ? undefined : modules.manifest?.modules
      const list = Array.isArray(rows) ? rows : []
      const row = list.find(entry => entry !== null && typeof entry === 'object' && entry.id === moduleId)
      return row !== undefined && typeof row.rev === 'string' ? row.rev : undefined
    }

    /** The request carrier the shell publishes, or the page's own `fetch`. */
    function shellFetch() {
      const transport = globalThis.__DSH_TRANSPORT__
      if (transport !== undefined && transport !== null && typeof transport.fetch === 'function') return transport.fetch
      return typeof fetch === 'function' ? fetch : undefined
    }

    /**
     * The revision the Host now serves for one module.
     *
     * `entries.reload(id, rev)` rewrites the bundle URL's `rev` query, and the
     * Host answers a revision it never published with 404 — so the revision has
     * to come from the Host. Its reload chain republishes the graph on the
     * document-relative events route the shipped HMR client already reads; this
     * reads that stream until a frame names a revision the page is not running.
     * @param moduleId - the module whose revision to read.
     * @param previous - the revision the page is running now.
     * @param timeoutMs - how long the read may take before it gives up.
     * @returns the new revision, or `undefined` when none arrives in time.
     */
    async function nextRevision(moduleId, previous, timeoutMs = REVISION_TIMEOUT_MS) {
      const request = shellFetch()
      if (request === undefined || typeof AbortController !== 'function') return undefined
      const controller = new AbortController()
      const timer = window.setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await request(EVENTS_ROUTE, {
          method: 'GET',
          headers: { accept: 'text/event-stream' },
          signal: controller.signal,
        })
        if (response?.ok !== true || response.body === null || response.body === undefined) return undefined
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done === true) return undefined
          buffer += decoder.decode(value, { stream: true })
          const { frames, rest } = eventFrames(buffer)
          buffer = rest
          for (const frame of frames) {
            const rev = revisionOfFrame(frame, moduleId, previous)
            if (rev === undefined) continue
            try {
              await reader.cancel()
            } catch (error) {
              // The stream is being abandoned either way.
            }
            return rev
          }
        }
      } catch (error) {
        return undefined
      } finally {
        window.clearTimeout(timer)
      }
    }

    /**
     * Replace this bundle's browser half in place.
     *
     * The shipped HMR client makes the same call when it sees a `rebuilt` frame;
     * this one makes the click deterministic instead of a race with it.
     * @param modules - the client module system, from its own optional scope.
     * @returns `replaced`, `absent` (no module system on this page), `stale` (the
     * Host published no new revision) or `failed` (the replacement threw).
     */
    async function reloadBrowserHalf(modules) {
      const entries = modules === null || modules === undefined ? undefined : modules.entries
      if (entries === undefined || entries === null || typeof entries.reload !== 'function') return 'absent'
      const rev = await nextRevision(PACKAGE_NAME, moduleRevision(modules, PACKAGE_NAME))
      if (rev === undefined) return 'stale'
      try {
        await entries.reload(PACKAGE_NAME, rev)
        return 'replaced'
      } catch (error) {
        updateWrite({ phase: 'reload-failed', rev, message: messageOf(error) })
        return 'failed'
      }
    }

    /**
     * The Plugin Manager action that updates EDH from its published repo.
     *
     * It checks on mount, quietly, and then offers the one thing it can do: apply
     * the published version, or re-check after a failure. It renders only on
     * EDH's own detail page and only while the update row is loaded, so a profile
     * whose patch predates the row never shows a control in front of a route
     * that does not exist yet.
     * @param t - the dictionary's translate function.
     * @param controller - the switch controller holding the row states.
     * @param reloader - holds the optional `modules` reload face.
     */
    function createUpdateControl(t, controller, reloader) {
      const useUpdateEnabled = createFeatureHook(controller, UPDATE_MODULE, rowEnabled)

      return function EdhUpdateControl({ subject }) {
        const enabled = useUpdateEnabled()
        const target = updateSubject(subject)
        const [state, setState] = React.useState(IDLE_UPDATE)
        const [hover, setHover] = React.useState(false)

        const check = React.useCallback(async () => {
          setState(previous => ({ ...previous, status: 'checking' }))
          let answer
          try {
            answer = await requestUpdate('GET')
          } catch (error) {
            updateWrite({ phase: 'failed', stage: 'check', reason: 'error', message: messageOf(error) })
            setState(readCheck({ ok: false, reason: 'error' }))
            return
          }
          const checked = readCheck(answer)
          if (checked.status === 'failed') {
            updateWrite({ phase: 'failed', stage: 'check', reason: checked.reason })
          } else {
            updateWrite({ phase: 'checked', status: checked.status, installed: checked.installed, latest: checked.latest })
          }
          setState(checked)
        }, [])

        const apply = React.useCallback(async () => {
          setState(previous => ({ ...previous, status: 'updating' }))
          updateWrite({ phase: 'update-started', latest: state.latest })
          let answer
          try {
            answer = await requestUpdate('POST')
          } catch (error) {
            updateWrite({ phase: 'failed', stage: 'apply', reason: 'error', message: messageOf(error) })
            setState(readApply({ ok: false, reason: 'error' }))
            return
          }
          const applied = readApply(answer)
          setState(applied)
          if (applied.status === 'failed') {
            updateWrite({ phase: 'failed', stage: 'apply', reason: applied.reason })
            return
          }
          updateWrite({
            phase: 'updated',
            from: applied.from,
            to: applied.to,
            requiresRestart: applied.status === 'updated-needs-restart',
          })
          if (applied.status !== 'updated-live') return
          // The Host reports the new half is live; hand this bundle to the client
          // module system so the new browser half runs instead of the old one.
          const reload = reloader.current
          const reloaded = typeof reload === 'function' ? await reload() : 'absent'
          if (reloaded === 'replaced') return
          updateWrite({ phase: 'updated-needs-restart', reload: reloaded })
          setState(previous => ({ ...previous, status: 'updated-needs-restart' }))
        }, [state.latest])

        // Check quietly as soon as the page proves to be EDH's own and the row
        // that answers the route is loaded.
        React.useEffect(() => {
          if (target === undefined || !enabled) return
          updateWrite({ phase: 'mounted', subject: target, module: UPDATE_MODULE, reload: typeof reloader.current === 'function' })
          void check()
        }, [target, enabled])

        if (!enabled || target === undefined) return null

        const busy = state.status === 'checking' || state.status === 'updating'
        const actionable = state.status === 'update-available'
          || state.status === 'up-to-date'
          || state.status === 'not-a-checkout'
          || state.status === 'failed'
        const primary = state.status === 'update-available'
        const text = updateText(state, t)

        return h('button', {
          type: 'button',
          'aria-label': text.label,
          'aria-busy': busy || undefined,
          title: text.title,
          disabled: !actionable,
          onClick: () => {
            if (!actionable) return
            if (state.status === 'update-available') void apply()
            else void check()
          },
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '24px',
            padding: '0 8px',
            border: primary ? '1px solid var(--dsw-alias-brand-primary)' : '1px solid transparent',
            borderRadius: '6px',
            background: hover && actionable ? 'var(--dsw-alias-bg-layer-1)' : 'transparent',
            color: primary ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-label-secondary)',
            font: 'inherit',
            fontSize: '12px',
            lineHeight: '16px',
            whiteSpace: 'nowrap',
            cursor: actionable ? 'pointer' : 'default',
            flexShrink: 0,
            userSelect: 'none',
            transition: 'background 120ms ease, color 120ms ease',
          },
        }, text.label)
      }
    }

    /**
     * One request on the update route. The Host answers a report with 200 and
     * only an unsupported method with anything else, so a non-200 status is the
     * route failing rather than a version being unavailable.
     * @param method - `GET` to check, `POST` to apply.
     * @returns the parsed answer.
     */
    async function requestUpdate(method) {
      const response = await fetch(UPDATE_ROUTE, { method, headers: { accept: 'application/json' } })
      if (response?.ok !== true) throw new Error(`${UPDATE_ROUTE} answered ${response?.status ?? 'nothing'}`)
      return await response.json()
    }

    /**
     * Shadowing priority for a keyed slot entry.
     *
     * A keyed slot refuses a second entry for the same `key` at the *same*
     * priority — it throws instead of replacing. Entries are kept sorted by
     * priority ascending and the first entry per key is the one that renders, so
     * a shadow registers below the shipped entry's implicit priority 0.
     */
    const SHADOW_PRIORITY = -1

    /** Required services: slot registry, locale, and the Plugin Manager Remote face. */
    const inject = ['slots', 'locale', 'remote', 'remote.pluginManager']

    /**
     * Mount the EDH master switch and the surfaces it governs.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      const t = ctx.locale.bind(NS)
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'edh: dictionary')

      const controller = createController(ctx.remote.pluginManager)
      void controller.refresh()

      ctx.effect(() => {
        const disposeChanged = ctx.remote.$on('plugin-manager/changed', () => {
          void controller.refresh()
        })
        return () => {
          disposeChanged()
        }
      }, 'edh: host invalidation')

      const Switch = createSwitch(t, controller)
      // The right-aligned header utilities row is the seat this build paints.
      // `conversation.header.leading` is declared but never rendered here.
      ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
        name: 'conversation.session.header.utilities',
        id: 'edh',
        order: -20,
        label: () => t('label'),
      }, Switch))

      // export — one download action beside the switch. It carries its own row's
      // enablement, so pausing the feature removes the action without touching
      // the switch that paused it.
      const ExportButton = createExportButton(t, controller)
      ctx.slots.inject('conversation.session.header.utilities', () => {
        try {
          return ctx.slots.register({
            name: 'conversation.session.header.utilities',
            id: 'edh-export',
            order: -10,
            locale: NS,
            label: () => t('export'),
          }, ExportButton)
        } catch (error) {
          exportWrite({ phase: 'register-failed', message: String(error?.message ?? error) })
          throw error
        }
      })

      // update — one action in Plugin Manager, on EDH's own detail page only. It
      // checks the published version on mount and applies it on click; applying
      // then hands the bundle back to the client module system so the new
      // browser half runs without a page reload.
      /** Filled by the optional `modules` scope; absent when the page has none. */
      const reloader = { current: undefined }
      const UpdateControl = createUpdateControl(t, controller, reloader)
      ctx.slots.inject('plugins.detail.actions', () => {
        try {
          return ctx.slots.register({
            name: 'plugins.detail.actions',
            id: 'edh-update',
            order: 10,
            locale: NS,
            label: () => t('update'),
          }, UpdateControl)
        } catch (error) {
          updateWrite({ phase: 'register-failed', message: String(error?.message ?? error) })
          throw error
        }
      })

      // The reload face is optional: without `modules` the control still checks
      // and applies, it just cannot replace the browser half and says so.
      ctx.inject(['modules'], scope => {
        scope.effect(() => {
          reloader.current = () => reloadBrowserHalf(scope.modules)
          return () => {
            reloader.current = undefined
          }
        }, 'edh: update reload')
      })

      // edit — replace the `user` Chat renderer so a user message gains an Edit
      // action, and seed the fork's composer from the click. It mounts on its own
      // dependency scope: if Session control ever goes away, the control surface
      // above must keep working, so this never joins the required service list.
      ctx.inject(['sessions', 'uiWorkspace'], scope => {
        try {
          ctx.effect(() => installEditStyles(), 'edh: edit styles')
          const UserMessageView = createUserMessageView(t, controller, scope)
          // `priority` is what makes this a shadow rather than a collision: the
          // shipped `user` entry sits at the implicit priority 0, a keyed slot
          // throws on a duplicate key at the same priority, and the lowest
          // priority is the one that renders.
          //
          // Slot callbacks run after this scope body, so their failures are not
          // caught here — each one records its own breadcrumb instead.
          ctx.slots.inject('conversation.chat.node', () => {
            try {
              const dispose = ctx.slots.register({
                name: 'conversation.chat.node',
                key: 'user',
                priority: SHADOW_PRIORITY,
                locale: NS,
              }, UserMessageView)
              editWrite({ phase: 'shadowed', priority: SHADOW_PRIORITY })
              return dispose
            } catch (error) {
              editWrite({ phase: 'shadow-failed', message: String(error?.message ?? error) })
              throw error
            }
          })
          ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
            name: 'conversation.input.dock',
            id: 'edh-edit',
            order: -100,
            locale: NS,
          }, PendingEditConsumer))
        } catch (error) {
          editWrite({ phase: 'register-failed', message: String(error?.message ?? error) })
        }
      })
    }

    const exports = { apply, inject }
    // Exposed for the Node test that exercises the controller against fake Remotes.
    exports.__test = {
      createController,
      createSwitch,
      findFeatures,
      featureEnabled,
      contentParts,
      formatClock,
      unwrap,
      rowEnabled,
      updateSubject,
      readCheck,
      readApply,
      updateText,
      failureNote,
      revisionOfFrame,
      eventFrames,
      moduleRevision,
      NS,
      EDIT_MODULE,
      EXPORT_MODULE,
      UPDATE_MODULE,
      PACKAGE_NAME,
      UPDATE_ROUTE,
      EVENTS_ROUTE,
      UPDATE_DEBUG_KEY,
    }

    return exports
  },
})
