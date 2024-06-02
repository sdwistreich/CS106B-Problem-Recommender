import React from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './Categories.css';

function Categories({ topics, onRankChange, onSubmit }) {
  const handleOnDragEnd = (result) => {
    if (!result.destination) return;

    const newTopics = Array.from(topics);
    const [reorderedItem] = newTopics.splice(result.source.index, 1);
    newTopics.splice(result.destination.index, 0, reorderedItem);

    // Update rank based on the new order
    const updatedTopics = newTopics.map((topic, index) => ({
      ...topic,
      rank: index + 1  // Rank set based on position in the array (1-indexed)
    }));

    onRankChange(updatedTopics);
  };

  return (
    <DragDropContext onDragEnd={handleOnDragEnd}>
      <Droppable droppableId="topics">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {topics.map((topic, index) => (
              <Draggable key={topic.id} draggableId={topic.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className="category">
                    <h3>{topic.name}</h3>
                    <p>#{topic.rank}</p>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}

export default Categories;
