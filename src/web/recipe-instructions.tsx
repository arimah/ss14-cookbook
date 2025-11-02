import {ReactElement, memo} from 'react';

import {
  AddReagentStep,
  AddStep,
  AlsoMakesStep,
  ConstructionStep,
  EndStep,
  HeatMixtureStep,
  HeatStep,
  MixStep,
  SimpleInteractionStep,
  StartStep,
} from '../types';

import {useGameData} from './context';
import {RawSprite} from './sprites';
import {
  ReagentIngredient,
  RecipeIngredients,
  SolidIngredient,
} from './recipe-ingredients';
import {Temperature} from './temperature';

export interface RecipeInstructionsProps {
  steps: readonly ConstructionStep[];
  visible: boolean;
}

export const RecipeInstructions = memo((
  props: RecipeInstructionsProps
): ReactElement => {
  const {visible, steps} = props;
  return (
    <ol className='recipe_instructions'>
      {steps.map((step, i) =>
        <Step key={i} step={step} visible={visible}/>
      )}
    </ol>
  );
});

interface StepProps {
  step: ConstructionStep;
  visible: boolean;
}

const Step = (props: StepProps): ReactElement => {
  const {step, visible} = props;
  switch (step.type) {
    case 'start':
      return <StartStep step={step}/>;
    case 'end':
      return <EndStep step={step}/>;
    case 'mix':
      return <MixStep step={step} visible={visible}/>;
    case 'add':
      return <AddStep step={step}/>;
    case 'addReagent':
      return <AddReagentStep step={step}/>;
    case 'heat':
      return <HeatStep step={step}/>;
    case 'heatMixture':
      return <HeatMixtureStep step={step}/>;
    case 'cut':
    case 'roll':
    case 'stir':
    case 'shake':
      return <SimpleStep step={step}/>;
    case 'alsoMakes':
      return <AlsoMakesStep step={step}/>;
  }
};

interface StartStepProps {
  step: StartStep;
}

const StartStep = (props: StartStepProps): ReactElement => {
  const {step} = props;
  return (
    <li className='recipe_step recipe_step--compact'>
      Take <SolidIngredient id={step.entity}/>
    </li>
  );
};

interface EndStepProps {
  step: EndStep;
}

const EndStep = (props: EndStepProps): ReactElement => {
  const {step} = props;
  if (typeof step.entity === 'string') {
    return (
      <li className='recipe_step recipe_step--compact'>
        Finish with <SolidIngredient id={step.entity}/>
      </li>
    );
  } else {
    return (
      <li className='recipe_step recipe_step--add'>
        <span>Finish with one of:</span>
        {step.entity.map(id => <SolidIngredient key={id} id={id}/>)}
      </li>
    );
  }
};

interface MixStepProps {
  step: MixStep;
  visible: boolean;
}

const MixStep = (props: MixStepProps): ReactElement => {
  const {step, visible} = props;

  // Slightly more compact view if there's only one ingredient.
  // I really wish JS had a better way of traversing objects.
  const keys = Object.keys(step.reagents);
  if (keys.length === 1) {
    const id = keys[0];
    const ingredient = step.reagents[id];
    return (
      <li className='recipe_step recipe_step--compact'>
        {'Take '}
        <ReagentIngredient
          id={id}
          amount={ingredient.amount}
          catalyst={ingredient.catalyst}
        />
      </li>
    );
  } else {
    return (
      <li className='recipe_step recipe_step--mix'>
        <div>Mix:</div>
        <RecipeIngredients
          visible={visible}
          reagents={step.reagents}
          solids={{}}
        />
      </li>
    );
  }
};

interface AddStepProps {
  step: AddStep;
}

const AddStep = (props: AddStepProps): ReactElement => {
  const {step} = props;

  let text: string;
  if (step.minCount) {
    if (step.maxCount) {
      text = `Add ${step.minCount} to ${step.maxCount} `;
    } else {
      text = `Add ${step.minCount} or more`;
    }
  } else if (step.maxCount) {
    text = `Add up to ${step.maxCount} `;
  } else {
    text = `Add `;
  }

  // More compact appearance if only one entity matches
  if (typeof step.entity === 'string') {
    return (
      <li className='recipe_step recipe_step--compact'>
        {text} <SolidIngredient id={step.entity}/>
      </li>
    );
  } else {
    if (step.minCount || step.maxCount) {
      text += ' of any of:';
    } else {
      text += ' any of:';
    }
    return (
      <li className='recipe_step recipe_step--add'>
        <span>{text}</span>
        {step.entity.map(id => <SolidIngredient key={id} id={id}/>)}
      </li>
    );
  }
};

interface AddReagentStepProps {
  step: AddReagentStep;
}

const AddReagentStep = (props: AddReagentStepProps): ReactElement => {
  const {step} = props;

  const amount = step.minCount !== step.maxCount
    ? [step.minCount, step.maxCount] as const
    : step.minCount;

  return (
    <li className='recipe_step recipe_step--compact'>
      Add <ReagentIngredient id={step.reagent} amount={amount}/>
    </li>
  );
};

interface HeatStepProps {
  step: HeatStep;
}

const HeatStep = (props: HeatStepProps): ReactElement => {
  const {step} = props;

  const {methodSprites} = useGameData();

  return (
    <li className='recipe_step recipe_step--simple'>
      <RawSprite position={methodSprites.heat!} alt=''/>
      Heat it to <Temperature k={step.minTemp}/>
    </li>
  );
};

interface HeatMixtureStepProps {
  step: HeatMixtureStep;
}

const HeatMixtureStep = (props: HeatMixtureStepProps): ReactElement => {
  const {step} = props;

  const {methodSprites} = useGameData();

  return (
    <li className='recipe_step recipe_step--simple'>
      <RawSprite position={methodSprites.heatMixture!} alt=''/>
      {' '}
      {step.maxTemp != null ? <>
        Heat it to between <Temperature k={step.minTemp}/> and <Temperature k={step.maxTemp}/>
      </> : <>
        Heat it to <Temperature k={step.minTemp}/>
      </>}
    </li>
  );
};

interface SimpleStepProps {
  step: SimpleInteractionStep;
}

const SimpleStep = (props: SimpleStepProps): ReactElement => {
  const {step} = props;

  const {methodSprites} = useGameData();

  return (
    <li className='recipe_step recipe_step--simple'>
      <RawSprite position={methodSprites[step.type]!} alt=''/>
      {SimpleStepText[step.type]}
    </li>
  );
};

const SimpleStepText: Readonly<Record<SimpleInteractionStep['type'], string>> = {
  cut: 'Cut it',
  roll: 'Roll it',
  shake: 'Shake it',
  stir: 'Stir it',
};

interface AlsoMakesStepProps {
  step: AlsoMakesStep;
}

const AlsoMakesStep = (props: AlsoMakesStepProps): ReactElement => {
  const {step} = props;

  // More compact appearance if there's only one other entity
  if (typeof step.entity === 'string') {
    return (
      <li className='recipe_step recipe_step--compact recipe_step--also'>
        Also makes <SolidIngredient id={step.entity}/>
      </li>
    );
  } else {
    return (
      <li className='recipe_step recipe_step--add recipe_step--also'>
        <span>Also makes:</span>
        {step.entity.map(id => <SolidIngredient key={id} id={id}/>)}
      </li>
    );
  }
};
