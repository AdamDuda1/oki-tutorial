import vine from '@vinejs/vine'

const optionalUrl = () => vine.string().url().optional().nullable()
const optionalText = () => vine.string().optional().nullable()

export const taskValidator = vine.create({
  nazwa: vine.string().trim().minLength(1),
  zrodlo: vine.string().trim().minLength(1),
  linkTresc: vine.string().url(),
  linkWyslij: optionalUrl(),
  linkZrodlo: optionalUrl(),
  omowienieText: optionalText(),
  linkOmowienieVid: optionalUrl(),
  linkDodatkoweMaterialy: optionalUrl(),
  szkopulContest: vine.string().trim().minLength(1),
  szkopulPiId: vine.number().positive(),
  szkopulShortName: vine.string().trim().minLength(1),
  idPoziomuTrudnosci: vine.number(),
  hint: optionalText(),
  kodCpp: optionalText(),
  kodPython: optionalText(),
  tagi: vine.array(vine.string().trim().minLength(1)).optional(),
})
