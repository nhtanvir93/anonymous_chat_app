import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { MessagesService } from './messages.service';
import { GetMessagesDto } from './dto/get-messages.dto';

@Controller('rooms/:id/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  async getMessages(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query() query: unknown,
  ) {
    const dto = plainToInstance(GetMessagesDto, query);

    const result = await this.messagesService.getMessages(id, dto);

    return {
      success: true,
      data: result,
    };
  }
}
