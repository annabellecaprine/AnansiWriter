import { create } from 'zustand'

export type DialogType = 'alert' | 'confirm' | 'prompt'

export interface DialogOptions {
    title: string
    message?: string
    defaultValue?: string
    placeholder?: string
    confirmLabel?: string
    cancelLabel?: string
    isDestructive?: boolean
    allowEmpty?: boolean
    validate?: (value: string) => string | null | undefined
}

interface DialogState extends DialogOptions {
    isOpen: boolean
    type: DialogType
    resolve: ((value: any) => void) | null

    alert: (options: DialogOptions | string) => Promise<void>
    confirm: (options: DialogOptions | string) => Promise<boolean>
    prompt: (options: DialogOptions) => Promise<string | null>
    close: (result: any) => void
}

export const useDialogStore = create<DialogState>((set, get) => ({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    defaultValue: '',
    placeholder: '',
    confirmLabel: 'OK',
    cancelLabel: 'Cancel',
    isDestructive: false,
    allowEmpty: false,
    resolve: null,

    alert: (options) => {
        const opts = typeof options === 'string' ? { title: 'Notice', message: options } : options
        return new Promise<void>((resolve) => {
            set({
                isOpen: true,
                type: 'alert',
                title: opts.title || 'Notice',
                message: opts.message || '',
                confirmLabel: opts.confirmLabel || 'OK',
                cancelLabel: 'Cancel',
                isDestructive: !!opts.isDestructive,
                resolve: () => resolve(),
            })
        })
    },

    confirm: (options) => {
        const opts = typeof options === 'string' ? { title: 'Confirm', message: options } : options
        return new Promise<boolean>((resolve) => {
            set({
                isOpen: true,
                type: 'confirm',
                title: opts.title || 'Confirm',
                message: opts.message || '',
                confirmLabel: opts.confirmLabel || (opts.isDestructive ? 'Delete' : 'Confirm'),
                cancelLabel: opts.cancelLabel || 'Cancel',
                isDestructive: !!opts.isDestructive,
                resolve: (val: boolean) => resolve(val),
            })
        })
    },

    prompt: (options) => {
        return new Promise<string | null>((resolve) => {
            set({
                isOpen: true,
                type: 'prompt',
                title: options.title || 'Input Required',
                message: options.message || '',
                defaultValue: options.defaultValue || '',
                placeholder: options.placeholder || '',
                confirmLabel: options.confirmLabel || 'Submit',
                cancelLabel: options.cancelLabel || 'Cancel',
                isDestructive: !!options.isDestructive,
                allowEmpty: !!options.allowEmpty,
                validate: options.validate,
                resolve: (val: string | null) => resolve(val),
            })
        })
    },

    close: (result) => {
        const { resolve } = get()
        if (resolve) resolve(result)
        set({ isOpen: false, resolve: null })
    },
}))

export const confirmAlert = (options: DialogOptions | string) => useDialogStore.getState().alert(options)
export const confirmAction = (options: DialogOptions | string) => useDialogStore.getState().confirm(options)
export const promptInput = (options: DialogOptions) => useDialogStore.getState().prompt(options)
