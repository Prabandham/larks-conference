jest.mock('../actions/CallActions')
jest.mock('../socket')
jest.mock('../window')
jest.useFakeTimers()

import React from 'react'
import ReactDOM from 'react-dom'
import TestUtils from 'react-dom/test-utils'
import { Provider } from 'react-redux'
import { AnyAction, applyMiddleware, createStore } from 'redux'
import { init } from '../actions/CallActions'
import * as constants from '../constants'
import reducers from '../reducers'
import { middlewares, State, Store } from '../store'
import { MediaStream } from '../window'
import App from './App'

describe('App', () => {

  const initAction = { type: 'INIT' }

  let store: Store
  let state: Partial<State>
  let dispatchSpy: jest.SpyInstance<AnyAction, AnyAction[]>
  beforeEach(() => {
    state = {};
    (init as jest.Mock).mockReturnValue(initAction)

    window.HTMLMediaElement.prototype.play = jest.fn()
  })

  afterEach(() => {
    if (dispatchSpy) {
      dispatchSpy.mockReset()
      dispatchSpy.mockRestore()
    }
  })

  let node: Element
  async function render () {
    store = createStore(
      reducers,
      state,
      applyMiddleware(...middlewares),
    )
    dispatchSpy = jest.spyOn(store, 'dispatch')
    const div = document.createElement('div')
    node = await new Promise<HTMLDivElement>(resolve => {
      ReactDOM.render(
        <Provider store={store}>
          <div ref={div => resolve(div!)}>
            <App />
          </div>
        </Provider>,
        div,
      )
    })
  }

  describe('render', () => {
    it('renders without issues', async () => {
      await render()
      expect(node).toBeTruthy()
      expect((init as jest.Mock).mock.calls.length).toBe(1)
    })
  })

  describe('chat toggle', () => {
    it('toggles chat state', async () => {
      await render()
      const chatButton = node.querySelector('.toolbar .button.chat')!
      expect(chatButton).toBeTruthy()
      TestUtils.Simulate.click(chatButton)
      TestUtils.Simulate.click(chatButton)
    })
  })

  describe('state', () => {
    beforeEach(async () => {
      state.streams = {
        [constants.ME]: {
          userId: constants.ME,
          streams: [{
            stream: new MediaStream(),
            type: constants.STREAM_TYPE_CAMERA,
            url: 'blob://',
          }],
        },
        'other-user': {
          userId: 'other-user',
          streams: [{
            stream: new MediaStream(),
            type: undefined,
            url: 'blob://',
          }],
        },
      }
      state.peers = {
        'other-user': {} as any,
      }
      state.notifications = {
        'notification1': {
          id: 'notification1',
          message: 'test',
          type: 'warning',
        },
      }
      await render()
    })

    describe('video', () => {
      beforeEach(() => {
        dispatchSpy.mockClear()
      })

      it('forces play on click', () => {
        const video = node.querySelector('video')!
        TestUtils.Simulate.mouseDown(video)
        TestUtils.Simulate.mouseUp(video)
        TestUtils.Simulate.click(video)
        expect(dispatchSpy.mock.calls[0][0].type).toBe(constants.MEDIA_PLAY)
      })

    })

    describe('video menu', () => {
      beforeEach(() => {
        dispatchSpy.mockClear()
      })

      it('minimizes the video on "Maximize" click', () => {
        let minimized = node.querySelectorAll('.videos-toolbar video')
        expect(minimized.length).toBe(0)
        let maximized = node.querySelectorAll('.videos-grid video')
        expect(maximized.length).toBe(2)

        const item = node.querySelector('.dropdown .action-minimize')!
        expect(item).toBeTruthy()
        TestUtils.Simulate.click(item)
        expect(dispatchSpy.mock.calls).toEqual([[{
          type: constants.MINIMIZE_TOGGLE,
          payload: {
            userId: constants.ME,
            streamId: store.getState()
            .streams![constants.ME].streams[0].stream.id,
          },
        }]])

        minimized = node.querySelectorAll('.videos-toolbar video')
        expect(minimized.length).toBe(1)
        maximized = node.querySelectorAll('.videos-grid video')
        expect(maximized.length).toBe(1)
      })

      it('toggles object-fit on "Toggle Fit" click', () => {
        ['contain', ''].forEach(objectFit => {
          const item = node.querySelector('.dropdown .action-toggle-fit')!
          expect(item).toBeTruthy()
          TestUtils.Simulate.click(item)
          const video = node.querySelector('video')! as HTMLVideoElement
          expect((video).style.objectFit).toBe(objectFit)
          expect(dispatchSpy.mock.calls).toEqual([])
        })
      })
    })

  })

})
