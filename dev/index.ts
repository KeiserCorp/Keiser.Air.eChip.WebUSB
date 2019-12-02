import Vue from 'vue'
import EChipReaderWatcher from '../src/echipReaderWatcher'
import EChipReader from '../src/echipReader'
import EChip from '../src/echip'
import TZChip from '../src/tzChip'
import RTCChip from '../src/rtcChip'
import { EChipObject } from '../src/echipLib'
import SyntaxHighlight from './syntax'
import { SET_2 } from './test'

/* tslint:disable: no-unused-expression */
new Vue({
  el: '#app',
  created () {
    this.echipReaderWatcher.onConnect(this.echipReaderConnected)
  },
  data: {
    echipReaderWatcher: new EChipReaderWatcher(),
    echipReader: null as EChipReader | null,
    echip: null as EChip | null,
    rtcChip: null as RTCChip | null,
    tzChip: null as TZChip | null,
    echipData: null as EChipObject | null
  },
  methods: {
    async connect () {
      try {
        await this.echipReaderWatcher.start()
      } catch (error) {
        console.error(error.message)
      }
    },
    async disconnect () {
      try {
        await this.echipReaderWatcher.stop()
      } catch (error) {
        console.error(error.message)
      }
    },
    echipReaderConnected (echipReader: EChipReader) {
      this.echipReader = echipReader
      this.echipReader.onDisconnect(this.echipReaderDisconnected)
      this.echipReader.onEChipDetect(this.echipDetected)
      this.echipReader.onTZChipDetect(this.tzChipDetected)
      this.echipReader.onRTCChipDetect(this.rtcChipDetected)
    },
    echipReaderDisconnected () {
      this.echipReader = null
    },
    async echipDetected (echip: EChip) {
      this.echip = echip
      this.echip.onDisconnect(this.echipDisconnected)
      this.echipData = await this.echip.getData()
    },
    async rtcChipDetected (rtcChip: RTCChip) {
      this.rtcChip = rtcChip
      this.rtcChip.onDisconnect(this.echipDisconnected)
      this.echipData = await this.rtcChip.getData()
    },
    async tzChipDetected (tzChip: TZChip) {
      this.tzChip = tzChip
      this.tzChip.onDisconnect(this.echipDisconnected)
      this.echipData = await this.tzChip.getData()
    },
    echipDisconnected () {
      this.echip = null
      this.rtcChip = null
      this.tzChip = null
      this.echipData = null
    },
    async set () {
      if (this.echip) {
        this.echipData = null
        try {
          await this.echip.setData(SET_2)
          this.echipData = await this.echip.getData()
        } catch (error) {
          console.error(error.message)
        }
      }
    },
    async clear () {
      if (this.echip) {
        this.echipData = null
        try {
          await this.echip.clearData()
          this.echipData = await this.echip.getData()
        } catch (error) {
          console.error(error.message)
        }
      }
    }
  },
  computed: {
    echipDataHtml: function (): string {
      if (!this.echipData) {
        return ''
      }
      return SyntaxHighlight(this.echipData.machineData)
    }
  }
})
