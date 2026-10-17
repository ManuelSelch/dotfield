// Authored design studies, not production map-generation rules.
const city = (id, x, y, owner = 'neutral', factory = false) => ({ id, x, y, owner, factory });
const southern = [
  city('home-player', 65, 575, 'player'), city('home-enemy', 355, 575, 'enemy'),
  city('supply-west', 80, 495, 'player'), city('supply-east', 340, 495, 'enemy'),
  city('bridge-south-west', 65, 445, 'player'), city('bridge-south-east', 355, 445, 'enemy'),
  city('bridge-north-west', 65, 355, 'player'), city('bridge-north-east', 355, 355, 'enemy'),
];
export const layouts = [
  {
    id: 'a', title: 'The far basin',
    description: 'Cross first. Then choose a flank around the ridge. The relay is a destination—not the crossing itself.',
    note: '<strong>Commitment:</strong> bridge control gets you onto the far bank, not onto the objective. Sending troops up one flank leaves the other approach open.',
    river: [386, 414], bridges: [65, 355],
    mountains: [[165, 210, 255, 305], [185, 465, 235, 610]],
    cities: [...southern, city('flank-west', 85, 270), city('flank-east', 335, 270), city('approach-west', 105, 175), city('approach-east', 315, 175), city('relay', 210, 115), city('economy-west', 65, 70, 'neutral', true), city('economy-east', 355, 70, 'neutral', true)],
    paths: [
      ['home-player', 'supply-west', 'bridge-south-west', 'bridge-north-west', 'flank-west', 'approach-west', 'relay'],
      ['home-enemy', 'supply-east', 'bridge-south-east', 'bridge-north-east', 'flank-east', 'approach-east', 'relay'],
    ],
    economyPaths: [['approach-west', 'economy-west'], ['approach-east', 'economy-east']],
  },
  {
    id: 'b', title: 'The mountain courtyard',
    description: 'A relay between two ridges, with entrances from north and south. Side valleys lead to production behind it.',
    note: '<strong>Encirclement:</strong> rush the southern entrance, or take a side valley and attack from behind. Holding one entrance does not secure the other.',
    river: [386, 414], bridges: [65, 355],
    mountains: [[115, 180, 165, 300], [255, 180, 305, 300], [185, 465, 235, 610]],
    cities: [...southern, city('south-gate', 210, 345), city('relay', 210, 245), city('north-gate', 210, 130), city('valley-west', 65, 235), city('valley-east', 355, 235), city('economy-west', 75, 85, 'neutral', true), city('economy-east', 345, 85, 'neutral', true)],
    paths: [
      ['home-player', 'supply-west', 'bridge-south-west', 'bridge-north-west', 'south-gate', 'relay'],
      ['home-enemy', 'supply-east', 'bridge-south-east', 'bridge-north-east', 'valley-east', 'economy-east', 'north-gate', 'relay'],
    ],
    economyPaths: [['bridge-north-west', 'valley-west', 'economy-west', 'north-gate']],
  },
  {
    id: 'c', title: 'The exposed lowland',
    description: 'The relay is easy to reach from either bridge. Valuable production lies farther away, beyond the mountain.',
    note: '<strong>Economy versus points:</strong> hold the open lowland now, or push past it for the factories. Their output helps later—but leaving the relay unattended costs time.',
    river: [386, 414], bridges: [65, 355],
    mountains: [[165, 145, 255, 240], [185, 465, 235, 610]],
    cities: [...southern, city('approach-west', 105, 300), city('approach-east', 315, 300), city('relay', 210, 315), city('valley-west', 65, 205), city('valley-east', 355, 205), city('economy-west', 105, 80, 'neutral', true), city('economy-east', 315, 80, 'neutral', true), city('upper-link', 210, 60)],
    paths: [
      ['home-player', 'supply-west', 'bridge-south-west', 'bridge-north-west', 'approach-west', 'relay'],
      ['home-enemy', 'supply-east', 'bridge-south-east', 'bridge-north-east', 'approach-east', 'relay'],
    ],
    economyPaths: [['approach-west', 'valley-west', 'economy-west', 'upper-link'], ['approach-east', 'valley-east', 'economy-east', 'upper-link']],
  },
];
