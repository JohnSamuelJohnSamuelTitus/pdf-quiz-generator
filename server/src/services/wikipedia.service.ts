import { WikipediaSummary } from '../../../shared/types.js';
import { getCached, setCached } from './cache.service.js';

// High-fidelity fallback database for verified offline/sandbox execution
const FALLBACK_WIKI: Record<string, WikipediaSummary> = {
  'algorithm': {
    title: 'Algorithm',
    displayTitle: 'Algorithm',
    extract: 'In mathematics and computer science, an algorithm is a finite sequence of rigorous instructions, typically used to solve a class of specific problems or to perform a computation. Algorithms are always unambiguous and are used as specifications for performing calculations, data processing, automated reasoning, and other tasks.',
    description: 'Finite sequence of mathematical or computational instructions',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/CPT-Programming-algorithmic.svg/320px-CPT-Programming-algorithmic.svg.png',
    pageUrl: 'https://en.wikipedia.org/wiki/Algorithm'
  },
  'computer_science': {
    title: 'Computer science',
    displayTitle: 'Computer science',
    extract: 'Computer science is the study of computation, information, and automation. Computer science spans theoretical disciplines (such as algorithms, theory of computation, and information theory) to applied disciplines (including the design and implementation of hardware and software).',
    description: 'Study of computation, information, and automation',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Comparison_of_sorting_algorithms.svg/320px-Comparison_of_sorting_algorithms.svg.png',
    pageUrl: 'https://en.wikipedia.org/wiki/Computer_science'
  },
  'operating_system': {
    title: 'Operating system',
    displayTitle: 'Operating system',
    extract: 'An operating system (OS) is system software that manages computer hardware, software resources, and provides common services for computer programs. Time-sharing operating systems schedule tasks for efficient use of the system and may also include accounting software for cost allocation of processor time, mass storage, printing, and other resources.',
    description: 'System software that manages computer hardware and software resources',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Operating_system_placement.svg/320px-Operating_system_placement.svg.png',
    pageUrl: 'https://en.wikipedia.org/wiki/Operating_system'
  },
  'linear_algebra': {
    title: 'Linear algebra',
    displayTitle: 'Linear algebra',
    extract: 'Linear algebra is the branch of mathematics concerning linear equations, linear functions, and their representations through matrices and vector spaces. Linear algebra is central to almost all areas of mathematics, data science, quantum physics, and computer graphics.',
    description: 'Branch of mathematics concerning vector spaces and linear equations',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Linear_subspaces_with_shading.svg/320px-Linear_subspaces_with_shading.svg.png',
    pageUrl: 'https://en.wikipedia.org/wiki/Linear_algebra'
  },
  'calculus': {
    title: 'Calculus',
    displayTitle: 'Calculus',
    extract: 'Calculus, originally called infinitesimal calculus, is the mathematical study of continuous change. It has two major branches: differential calculus concerning instantaneous rates of change and slopes of curves, and integral calculus concerning accumulation of quantities and areas under curves.',
    description: 'Mathematical study of continuous change',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Integral_as_region_under_curve.svg/320px-Integral_as_region_under_curve.svg.png',
    pageUrl: 'https://en.wikipedia.org/wiki/Calculus'
  },
  'classical_mechanics': {
    title: 'Classical mechanics',
    displayTitle: 'Classical mechanics',
    extract: 'Classical mechanics is a physical theory describing the motion of macroscopic objects, from projectiles to parts of machinery, and astronomical objects, such as spacecraft, planets, stars, and galaxies. For objects governed by classical mechanics, if the present state is known, it is possible to predict how it will move in the future.',
    description: 'Physical theory describing the motion of macroscopic objects',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Free_body_diagram2.svg/320px-Free_body_diagram2.svg.png',
    pageUrl: 'https://en.wikipedia.org/wiki/Classical_mechanics'
  },
  'molecular_genetics': {
    title: 'Molecular genetics',
    displayTitle: 'Molecular genetics',
    extract: 'Molecular genetics is a sub-field of biology that addresses how differences in the structures or expression of DNA molecules manifest as variation among organisms. Molecular genetics often applies an "investigative approach" to determine the structure and function of genes in an organism genome using genetic screens.',
    description: 'Branch of biology that studies the structure and function of genes at a molecular level',
    thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/DNA_replication_split_horizontal.svg/320px-DNA_replication_split_horizontal.svg.png',
    pageUrl: 'https://en.wikipedia.org/wiki/Molecular_genetics'
  }
};

export class WikipediaService {
  private static readonly BASE_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';

  static async getSummary(topicKey: string): Promise<WikipediaSummary> {
    const normalizedKey = topicKey.trim().toLowerCase().replace(/[\s-]+/g, '_');
    const cacheKey = `wiki:${normalizedKey}`;

    // Check cache
    const cached = await getCached<WikipediaSummary>(cacheKey);
    if (cached) return cached;

    // Direct match check in fallback map if needed
    const directFallback = FALLBACK_WIKI[normalizedKey];

    try {
      const url = `${this.BASE_URL}/${encodeURIComponent(topicKey)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'LearnSphere/1.0 (academic CSE279 project; student@learnsphere.edu)'
        }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const json: any = await res.json();
        const summary: WikipediaSummary = {
          title: json.title,
          displayTitle: json.displaytitle || json.title,
          extract: json.extract || 'No extract available.',
          description: json.description,
          thumbnailUrl: json.thumbnail?.source,
          pageUrl: json.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(topicKey)}`
        };

        await setCached(cacheKey, 'Wikipedia', summary, 24 * 3600 * 1000);
        return summary;
      }
    } catch (err) {
      console.warn(`[WikipediaService] Live fetch failed for "${topicKey}". Using fallback.`);
    }

    if (directFallback) {
      await setCached(cacheKey, 'Wikipedia', directFallback, 3600 * 1000);
      return directFallback;
    }

    // Default generic fallback
    const generic: WikipediaSummary = {
      title: topicKey.replace(/_/g, ' '),
      displayTitle: topicKey.replace(/_/g, ' '),
      extract: `Authoritative study overview and principles covering ${topicKey.replace(/_/g, ' ')}. Explore core definitions, theoretical foundations, and practical applications in modern academia.`,
      description: `Academic topic in ${topicKey.replace(/_/g, ' ')}`,
      pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(topicKey)}`
    };

    return generic;
  }
}
