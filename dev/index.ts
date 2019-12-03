import Vue from 'vue'
import ChipReaderWatcher from '../src/chipReaderWatcher'
import { ChipReader } from '../src/chipReader'
// import { EChip } from '../src/echip'
import { BaseChip } from '../src/baseChip'
import { EChipObject } from '../src/chipLib'
import SyntaxHighlight from './syntax'
import { SET_2 } from './test'

/* tslint:disable: no-unused-expression */
new Vue({
  el: '#app',
  created () {
    this.chipReaderWatcher.onConnect(this.chipReaderConnected)
  },
  data: {
    chipReaderWatcher: ChipReaderWatcher,
    chipReader: null as ChipReader | null,
    chip: null as BaseChip | null,
    chipData: null as EChipObject | null
  },
  methods: {
    async connect () {
      try {
        await this.chipReaderWatcher.start()
      } catch (error) {
        console.error(error.message)
      }
    },
    async disconnect () {
      try {
        await this.chipReaderWatcher.stop()
      } catch (error) {
        console.error(error.message)
      }
    },
    chipReaderConnected (chipReader: ChipReader) {
      this.chipReader = chipReader
      this.chipReader.onDisconnect(this.chipReaderDisconnected)
      this.chipReader.onEChipDetect(this.chipDetected)
    },
    chipReaderDisconnected () {
      this.chipReader = null
    },
    async chipDetected (chip: BaseChip) {
      this.chip = chip
      this.chip.onDisconnect(this.chipDisconnected)
      // this.chipData = await this.chip.getData()
    },
    chipDisconnected () {
      this.chip = null
      this.chipData = null
    },
    async set () {
      if (this.chip) {
        this.chipData = null
        try {
          await this.chip.setData(SET_2)
          this.chipData = await this.chip.getData()
        } catch (error) {
          console.error(error.message)
        }
      }
    },
    async clear () {
      if (this.chip) {
        this.chipData = null
        try {
          await this.chip.clearData()
          this.chipData = await this.chip.getData()
        } catch (error) {
          console.error(error.message)
        }
      }
    }
  },
  computed: {
    chipDataHtml: function (): string {
      if (!this.chipData || !this.chipData.validStructure) {
        return ''
      }
      return SyntaxHighlight(this.chipData.machineData)
    }
  }
})
