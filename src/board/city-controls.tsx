import { useId, type SyntheticEvent } from 'react';

import {
  cityControlsModel,
  CONTROL_CITY_LABELS,
  CONTROL_CITY_ORDER,
  type CityControlsState,
  type ControlCityType,
} from './city-controls-model';
import './city-controls.css';

export interface CityControlsProps extends CityControlsState {
  onConvert: (type: ControlCityType) => void;
  onFly: () => void;
  onCancel: () => void;
}
function RoleIcon({ type }: { type: ControlCityType }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg
      className="city-controls__icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      {...common}
    >
      {type === 'production' && (
        <>
          <path d="M3 21V10l6 4v-4l6 4V3h4v18H3Z" />
          <path d="M6 17h1m4 0h1m4 0h1" />
        </>
      )}
      {type === 'defender' && <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />}
      {type === 'airfield' && (
        <path d="m12 3 2 6 7 4v2l-7-2v5l2 2v1l-4-1-4 1v-1l2-2v-5l-7 2v-2l7-4 2-6Z" />
      )}
      {type === 'watchtower' && (
        <path d="M5 21h14M7 21V10H5V4h3v3h3V4h2v3h3V4h3v6h-2v11M10 21v-5a2 2 0 0 1 4 0v5" />
      )}
      {type === 'artillery' && (
        <>
          <path d="m7 13 12-8 2 3-12 8M12 15l7 6M3 21h18" />
          <circle cx="7" cy="17" r="4" />
        </>
      )}
    </svg>
  );
}
/** One-row icon picker for the permanently reserved city-action strip.
 * Parent owns outside/Escape dismissal, focus restoration and lifecycle clearing.
 */
export function CityControls(props: CityControlsProps) {
  const id = useId();
  const model = cityControlsModel(props);
  const stop = (event: SyntheticEvent) => event.stopPropagation();
  return (
    // This region only stops bubbled events; its buttons implement all interaction.
    // aria-description is a global ARIA attribute, not yet recognized by this plugin.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/role-supports-aria-props
    <section
      className="city-controls"
      aria-label="Selected city controls"
      aria-description={`${props.name}, ${CONTROL_CITY_LABELS[props.cityType]}, ${props.troops} garrison troops`}
      onPointerDown={stop}
      onPointerUp={stop}
      onClick={stop}
    >
      <div className="city-controls__types" role="group" aria-label="Build or convert city role">
        {CONTROL_CITY_ORDER.map((type) => {
          const option = model.types.find((candidate) => candidate.type === type)!;
          const accessibleName = option.current
            ? `${option.label}, current role. ${model.status}`
            : `Build ${option.label} for ${option.cost} troops; leave 1 behind. ${option.reason}`;
          return (
            <button
              key={type}
              type="button"
              aria-label={accessibleName}
              aria-pressed={option.current}
              disabled={option.disabled}
              aria-describedby={`${id}-${type}`}
              title={accessibleName}
              onClick={() => {
                if (!option.disabled) props.onConvert(type);
              }}
            >
              <RoleIcon type={type} />
              <small>{option.current ? model.currentText : option.cost}</small>
            </button>
          );
        })}
      </div>
      {props.targeting ? (
        <button type="button" className="city-controls__action" onClick={props.onCancel}>
          Cancel
        </button>
      ) : (
        props.cityType === 'airfield' && (
          <button
            type="button"
            className="city-controls__action city-controls__fly"
            disabled={model.flyDisabled}
            aria-describedby={`${id}-fly ${id}-status`}
            onClick={props.onFly}
          >
            Fly
          </button>
        )
      )}
      {CONTROL_CITY_ORDER.map((type) => (
        <span className="city-controls__sr" id={`${id}-${type}`} key={type}>
          {model.types.find((option) => option.type === type)!.reason ||
            `${CONTROL_CITY_LABELS[type]} is the current city role.`}
        </span>
      ))}
      <span
        className="city-controls__sr"
        id={`${id}-status`}
        role={props.targeting ? 'status' : undefined}
      >
        {model.status}
      </span>
      <span className="city-controls__sr" id={`${id}-fly`}>
        {model.flyReason}
      </span>
    </section>
  );
}
