import Vue from 'vue'
import ChipReaderWatcher from '../src/chipReaderWatcher'
import { ChipReader } from '../src/chipReader'
import { Chip, DataChip, RTCChip, TZChip } from '../src/chips'
import { DataChipObject } from '../src/chipLib'
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
    chipData: null as DataChipObject | boolean | null
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
      if (this.chip instanceof DataChip) {
        this.chipData = await this.chip.getData()
      } else if (this.chip instanceof RTCChip || this.chip instanceof TZChip) {
        this.chipData = await this.chip.isSet()
      }
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
          this.chipData = await this.chip.getData()
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
          this.chipData = await this.chip.getData()
        } catch (error) {
          console.error(error.message)
        }
      }
    }
  },
  computed: {
    chipDataHtml: function (): string {
      if (!this.chipData || typeof this.chipData === 'boolean' || !this.chipData.validStructure) {
        return ''
      }
      return SyntaxHighlight(this.chipData.machineData)
    }
  }
})
