const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: [true, "Nombre de usuario es requerido"],
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Contraseña es requerida"],
        minlength: [8, "La contraseña debe tener al menos 8 caracteres"]
    },
    // "admin" ve y administra todo. "barbero" solo lo suyo: sus precios, sus
    // horarios y sus turnos.
    //
    // OJO con el default: Mongoose aplica los defaults del schema al hidratar
    // documentos que no tienen el campo, así que un usuario creado antes de
    // esta migración se leería como "barbero" y perdería el panel. Por eso
    // authenticate lee con .lean() y trata el rol ausente como "admin"
    // (ver auth.middleware.js), y existe scripts/migrarRolesUsuarios.js.
    rol: {
        type: String,
        enum: ["admin", "barbero"],
        default: "barbero",
        required: true
    },
    // Barbero que representa este usuario. null para los admin.
    barbero: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Barbero",
        default: null
    }
}, { timestamps: true });

// El userName tiene que ser único: `login` hace findOne({userName}) y con dos
// usuarios homónimos se quedaba con cualquiera de los dos. Nunca hubo índice
// (el plugin de unicidad que estaba puesto no cubría ningún path).
UserSchema.index({ userName: 1 }, { unique: true });

// Un barbero no puede tener dos usuarios. El índice es parcial para que los
// múltiples `barbero: null` de los admin no choquen entre sí.
UserSchema.index(
    { barbero: 1 },
    { unique: true, partialFilterExpression: { barbero: { $type: "objectId" } } }
);

UserSchema.virtual('confirmPassword')
    .get(function () { return this._confirmPassword; })
    .set(function (value) { this._confirmPassword = value; });

UserSchema.pre('validate', function (next) {
    if (this.password !== this.confirmPassword) {
        this.invalidate('confirmPassword', 'Las contraseñas deben coincidir');
    }
    next();
});

UserSchema.pre('save', function (next) {
    bcrypt.hash(this.password, 10)
        .then(hash => {
            this.password = hash;
            next();
        });
});

// Nota: acá había `UserSchema.plugin(mongoose-unique-validator)`. Se sacó
// porque (a) no cubría ningún path — ninguno tenía `unique: true`, así que era
// un no-op — y (b) no entiende `partialFilterExpression`: con el índice parcial
// de `barbero` daba por duplicado a cualquier usuario con `barbero: null`.
// La unicidad la garantizan los índices de arriba; los errores E11000 se
// traducen a mensajes legibles en user.controller.js.

module.exports.UserModel = mongoose.model('User', UserSchema);
