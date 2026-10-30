import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' with { type: 'json' };
import { faker } from '@faker-js/faker';

admin.initializeApp({
   // credential: admin.credential.cert(serviceAccount),
     projectId: 'thestudents-6bae0',
});

const db = admin.firestore();

const MATERIAS = [
    'Estructuras de Datos (ISIS1206)',
    'Física Mecánica (FIS1027)',
    'Cálculo I (MATE1103)',
    'Bases de Datos (ISIS2304)',
    'Desarrollo Móvil (ISIS3510)',
];

const PERIODOS = ['2025-1', '2025-2'];

function buildUser(i) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;

    return {
        id: String(i),
        nombre_usuario: username,
        nombre: `${firstName} ${lastName}`,
        biografia: faker.lorem.sentence(),
        foto_url: faker.image.urlPicsumPhotos({ width: 150, height: 150, blur: 0, grayscale: false }),
        color_perfil: faker.color.rgb(),
        carrera: faker.helpers.arrayElement([
            'Ingeniería de Sistemas',
            'Administración de Empresas',
            'Diseño Gráfico',
            'Psicología',
            'Medicina',
        ]),
        semestre: faker.number.int({ min: 1, max: 10 }),
        resenas_recibidas: [],
        resenas_creadas: [],
        followersCount: 0,
        followingCount: 0,
        followed: false,
    };
}

function buildInscripcion(user, materia, periodo) {
    return {
        materia: materia,
        periodo: periodo,
        usuario: {
            id: user.id,
            nombre_usuario: user.nombre_usuario,
            nombre: user.nombre,
            foto_url: user.foto_url,
            color_perfil: user.color_perfil,
        },
    };
}

function buildReview(i, autor, resenado, materia, periodo) {
    return {
        id: `review_${i}`,
        autor_id: autor.id,
        resenado_id: resenado.id,
        materia: materia,
        periodo: periodo,
        contenido: faker.lorem.sentences({ min: 1, max: 3 }),
        rating: String(faker.number.int({ min: 1, max: 5 })),
        likesCount: faker.number.int({ min: 0, max: 30 }),
        disLikes: faker.number.int({ min: 0, max: 10 }),
        commentsCount: 0,
        fechaCreacion: faker.date.recent({ days: 90 }).toISOString(),
        autor: {
            id: autor.id,
            nombre_usuario: autor.nombre_usuario,
            nombre: autor.nombre,
            foto_url: autor.foto_url,
            color_perfil: autor.color_perfil,
        },
        resenado: {
            id: resenado.id,
            nombre_usuario: resenado.nombre_usuario,
            nombre: resenado.nombre,
            foto_url: resenado.foto_url,
            color_perfil: resenado.color_perfil,
        },
    };
}

function buildMateria(nombre, periodos) {
    return {
        nombre: nombre,
        periodos: periodos,
    };
}

async function seedMaterias() {
    const batch = db.batch();

    for (const materia of MATERIAS) {
        const materiaRef = db.collection('materias').doc();
        batch.set(materiaRef, buildMateria(materia, PERIODOS));
    }

    await batch.commit();
}

async function seedUsers(cantidad = 50) {
    const batch = db.batch();
    const users = [];

    for (let i = 1; i <= cantidad; i++) {
        const user = buildUser(i);
        users.push(user);
        const userRef = db.collection('users').doc(user.id);
        batch.set(userRef, user);
    }

    await batch.commit();
    return users;
}

async function seedInscripciones(users) {
    const batch = db.batch();
    const inscripciones = [];

    for (const user of users) {
        for (const periodo of PERIODOS) {
            const materias = faker.helpers.arrayElements(MATERIAS, { min: 2, max: 3 });
            for (const materia of materias) {
                const inscripcion = buildInscripcion(user, materia, periodo);
                inscripciones.push(inscripcion);
                const inscripcionRef = db.collection('inscripciones').doc();
                batch.set(inscripcionRef, inscripcion);
            }
        }
    }

    await batch.commit();
    return inscripciones;
}

// Solo se reseñan estudiantes que comparten materia y periodo
async function seedReviews(inscripciones, reviewsPorMateria = 3) {
    const batch = db.batch();
    let i = 1;

    for (const materia of MATERIAS) {
        for (const periodo of PERIODOS) {
            const estudiantes = inscripciones
                .filter(insc => insc.materia === materia && insc.periodo === periodo)
                .map(insc => insc.usuario);

            if (estudiantes.length < 2) continue;

            for (let n = 0; n < reviewsPorMateria; n++) {
                const [autor, resenado] = faker.helpers.arrayElements(estudiantes, 2);
                const review = buildReview(i, autor, resenado, materia, periodo);
                const reviewRef = db.collection('reviews').doc(review.id);
                batch.set(reviewRef, review);
                i++;
            }
        }
    }

    await batch.commit();
}

async function main() {
    try {
        await seedMaterias();
        const users = await seedUsers(5);
        const inscripciones = await seedInscripciones(users);
        await seedReviews(inscripciones, 2);
        console.log('Datos cargados');
    } catch (error) {
        console.error(error);
    }
}

main();
