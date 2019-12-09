import Vue from 'vue'
import ChipReaderWatcher from '../src/chipReaderWatcher'
import { ChipReader } from '../src/chipReader'
import { Chip } from '../src/chips'
import { DataChip } from '../src/dataChip'
import { ChipObject, DataChipObject } from '../src/chipLib'
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
    chip: null as Chip | null,
    chipData: null as ChipObject | null
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
      this.chipReader.onChipDetect(this.chipDetected)
    },
    chipReaderDisconnected () {
      this.chipReader = null
    },
    async chipDetected (chip: Chip) {
      this.chip = chip
      this.chip.onDisconnect(this.chipDisconnected)
      this.chip.onData(data => this.chipData = data)
    },
    chipDisconnected () {
      this.chip = null
      this.chipData = null
    },
    async set () {
      if (this.chip instanceof DataChip) {
        this.chipData = null
        try {
          await this.chip.setData(SET_2)
        } catch (error) {
          console.error(error.message)
        }
      }
    },
    async clear () {
      if (this.chip instanceof DataChip) {
        this.chipData = null
        try {
          await this.chip.clearData()
        } catch (error) {
          console.error(error.message)
        }
      }
    }
  },
  computed: {
    chipDataHtml: function (): string {
      if (! (this.chipData instanceof DataChipObject) || !this.chipData.validStructure) {
        return ''
      }
      return SyntaxHighlight(this.chipData.machineData)
    }
  }
})
