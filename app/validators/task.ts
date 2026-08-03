import vine from '@vinejs/vine'
import { SZKOPUL_WLACZONY } from '#services/szkopul'

const optionalUrl = () => vine.string().url().optional().nullable()
const optionalText = () => vine.string().optional().nullable()

const szkopulTekst = () =>
  SZKOPUL_WLACZONY
    ? vine.string().trim().minLength(1)
    : vine.string().trim().minLength(1).optional().nullable()
const szkopulNumer = () =>
  SZKOPUL_WLACZONY ? vine.number().positive() : vine.number().positive().optional().nullable()

export const taskValidator = vine.create({
  nazwa: vine.string().trim().minLength(1),
  zrodlo: vine.string().trim().minLength(1),
  linkTresc: vine.string().url(),
  linkWyslij: optionalUrl(),
  linkZrodlo: optionalUrl(),
  omowienieText: optionalText(),
  linkOmowienieVid: optionalUrl(),
  linkDodatkoweMaterialy: optionalUrl(),
  szkopulContest: szkopulTekst(),
  szkopulPiId: szkopulNumer(),
  szkopulShortName: szkopulTekst(),
  idPoziomuTrudnosci: vine.number(),
  hint: optionalText(),
  kodCpp: optionalText(),
  kodPython: optionalText(),
  tagi: vine.array(vine.string().trim().minLength(1)).optional(),
})
