import vine from '@vinejs/vine'

const optionalUrl = () => vine.string().url().optional().nullable()
const optionalText = () => vine.string().optional().nullable()

export const taskValidator = vine.create({
  nazwa: vine.string(),
  zrodlo: vine.string(),
  linkTresc: vine.string().url(),
  linkWyslij: optionalUrl(),
  linkZrodlo: optionalUrl(),
  omowienieText: optionalText(),
  linkOmowienieVid: optionalUrl(),
  linkDodatkoweMaterialy: optionalUrl(),
  idPoziomuTrudnosci: vine.number().optional().nullable(),
  hint: optionalText(),
  kodCpp: optionalText(),
  kodPython: optionalText(),
  tagi: vine.array(vine.string().trim().minLength(1)).optional(),
})
