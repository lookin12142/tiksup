import { producer } from '../config/kafka.js';
import { streamDataSchema } from '../schemas/StreamDataSchema.js';
import { validateToken } from '../config/jwt.js';
import axios from 'axios';
import 'dotenv/config'

export const postUserMovieData = async (req, res) => {
  try {
    const { movie_id, watching_time, watching_repeat, data, next } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer')) 
      return res.status(401).json({ error: 'Token no proporcionado' });

    const token = authHeader.substring(7)
    const decodedToken = validateToken(token)
    if (decodedToken === null) 
      return res.status(401).json({ error: 'Token no valido' });

    const { error } = streamDataSchema.validate({ 
      user_id: decodedToken.user_id,
      movie_id, 
      watching_time, 
      watching_repeat, 
      data,
      next
    });
    
    if (error) {
      return res.status(400).json({ 
        serror: error.details[0].message.replace(/"/g, '') 
      });
    }

    const endpointURL = `${process.env.WORKER_URL}/user-info`;

    const response = await axios.get(endpointURL, {
      headers: {
        "Authorization": authHeader
      }
    });

    let preferencesResponse = response.data.preferences

    data.genre.forEach(genre => {
      let found = preferencesResponse.genre_score.find(g => g.name === genre);
      if (found) {
        found.score += calculateScore(watching_time, watching_repeat);
      } else {
        preferencesResponse.genre_score.push({ name: genre, score: calculateScore(watching_time, watching_repeat) });
      }
    });

    let protagonistFound = preferencesResponse.protagonist_score.find(p => p.name === data.protagonist);
    if (protagonistFound) {
      protagonistFound.score += calculateScore(watching_time, watching_repeat);
    } else {
      protagonistFound = { name: data.protagonist, score: calculateScore(watching_time, watching_repeat) };
    }

    let directorFound = preferencesResponse.director_score.find(d => d.name === data.director);
    if (directorFound) {
      directorFound.score += calculateScore(watching_time, watching_repeat);
    } else {
      directorFound = { name: data.director, score: calculateScore(watching_time, watching_repeat) };
    }

    let preferences = {
      genre_score: preferencesResponse.genre_score,
      protagonist_score: protagonistFound,
      director_score: directorFound
    };


    const mensajeJson = {
      user_id: decodedToken.user_id,
      movie_id,
      watching_time,
      watching_repeat,
      preferences,
      next,
    };

    const mensajeString = JSON.stringify(mensajeJson);

    await producer.send({
      topic: 'tiksup-user-data', 
      messages: [{ value: mensajeString }],
    });

    res.status(200).json({ message: 'Mensaje enviado a Kafka con éxito' });
  } catch (error) {
    console.error('Error al enviar mensaje a Kafka:', error);
    res.status(500).json({ error: 'Error al enviar mensaje a Kafka' });
  }
};

function calculateScore(watching_time, watching_repeat) {
  let score = 0;
  if (watching_time >= 15) {
    score += 1.0;
  } else if (watching_time >= 10) {
    score += 0.5;
  } else if (watching_time < 5) {
    score -= 0.5;
  }

  if (watching_repeat > 1) {
    score += 0.5 * (watching_repeat - 1);
  }

  return score;
}