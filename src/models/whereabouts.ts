import { Schema, model, Document } from "mongoose"

export interface IWhereabouts extends Document {
  user_id: string
  availability?: string
  message?: string
  last_update: Date
}

const schema = new Schema<IWhereabouts>({
  user_id: { type: String, required: true },
  availability: String,
  message: String,
  last_update: { type: Date, default: Date.now },
})

schema.index({ user_id: 1 }, { unique: true })

export default model<IWhereabouts>("whereabouts", schema)
